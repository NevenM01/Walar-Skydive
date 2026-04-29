"""
WALAR Bulk Import Script
========================
Imports all xlsx competition files into the live Supabase database.

Requirements:
    pip install openpyxl requests

Usage:
    1. Set IMPORT_DIR below to the folder containing your walar_imports xlsx files.
    2. Run:  python walar_bulk_import.py

Safe to run multiple times - upserts are used (no duplicates created).
"""

import os
import re
import sys
import time
import requests
import openpyxl
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

IMPORT_DIR = r'C:\Users\Neven\Desktop\goran\walar_imports'

SUPABASE_URL = 'https://kfbnnlfxsehuswzezcpj.supabase.co'
SERVICE_ROLE_KEY = (
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9'
    '.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtmYm5ubGZ4c2VodXN3emV6Y3BqIiwicm9sZSI6'
    'InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDM3MDMwNiwiZXhwIjoyMDg5OTQ2MzA2fQ'
    '.8CsAHiT6XjovfIXOdTTcQ7S0fmtJt3vprDD3sXde4bE'
)

RECALC_WORKERS = 8

# ---------------------------------------------------------------------------
# Country code mapping
# ---------------------------------------------------------------------------

ALIAS_TO_ISO2 = {
    '': 'XX', '0': 'XX', 'X': 'XX', 'XX': 'XX', 'XXX': 'XX',
    'INDIVIDUAL': 'XX', 'NEPOZNATO': 'XX', 'UNKNOWN': 'XX',
    'FAI': 'XX', 'SCG': 'XX',
    'YUGOSLAVIA': 'XX', 'SERBIA & MONTENEGRO': 'XX',
    'GERMANY': 'DE', 'FRANCE': 'FR', 'BRASIL': 'BR', 'BRAZIL': 'BR',
    'AUSTRIA': 'AT', 'CROATIA': 'HR', 'CZECH REPUBLIC': 'CZ', 'CZECHIA': 'CZ',
    'ITALY': 'IT', 'SWITZERLAND': 'CH', 'AUSTRALIA': 'AU', 'AUTRALIA': 'AU',
    'ROMANIA': 'RO', 'DENMARK': 'DK', 'UAE': 'AE', 'CHINA': 'CN',
    'CANADA': 'CA', 'BELGIUM': 'BE', 'ESPANA': 'ES', 'SPAIN': 'ES',
    'POLAND': 'PL', 'BULGARIA': 'BG', 'BELARUS': 'BY', 'RUSSIA': 'RU',
    'SERBIA': 'RS', 'QATAR': 'QA', 'HUNGARY': 'HU', 'USA': 'US',
    'SLOVENIA': 'SI', 'SLOVENIJA': 'SI', 'OMAN': 'OM', 'TURKEY': 'TR',
    'BAHREIN': 'BH', 'BAHRAIN': 'BH', 'KOREA': 'KR', 'EGYPT': 'EG',
    'SLOVAKIA': 'SK', 'INDONESIA': 'ID', 'NETHERLANDS': 'NL', 'NETHERLAND': 'NL',
    'KAZAHSTAN': 'KZ', 'KAZAKHSTAN': 'KZ', 'UKRAINA': 'UA', 'UKRAINE': 'UA',
    'MAROCO': 'MA', 'MOROCCO': 'MA', 'ALGERIA': 'DZ', 'GREAT BRITAIN': 'GB',
    'GREAT BRITAN': 'GB', 'LITHUANIA': 'LT', 'PORTUGAL': 'PT', 'THAILAND': 'TH',
    'MONTENEGRO': 'ME', 'SWEEDEN': 'SE', 'SWEDEN': 'SE', 'FINLAND': 'FI',
    'LATVIA': 'LV', 'MOLDOVA': 'MD', 'ARGENTINA': 'AR', 'LYBIA': 'LY',
    'LIBYA': 'LY', 'MONGOLIA': 'MN', 'NORTH MACEDONIA': 'MK', 'MACEDONIA': 'MK',
    'JORDAN': 'JO', 'BRUNEI': 'BN', 'KSA': 'SA', 'SA': 'SA', 'PALESTINE': 'PS',
    'VENEZUELA': 'VE', 'TUNIS': 'TN', 'TUNISIA': 'TN', 'KUWAIT': 'KW',
    'AFG': 'AF', 'ALB': 'AL', 'ALG': 'DZ', 'DZA': 'DZ', 'ARG': 'AR',
    'ARM': 'AM', 'AUS': 'AU', 'AUT': 'AT', 'AZE': 'AZ', 'BHR': 'BH',
    'BEL': 'BE', 'BLR': 'BY', 'BEN': 'BJ', 'BOL': 'BO', 'BIH': 'BA',
    'BRA': 'BR', 'BGR': 'BG', 'CAN': 'CA', 'CHL': 'CL', 'COL': 'CO',
    'HRV': 'HR', 'CRO': 'HR', 'CZE': 'CZ', 'DNK': 'DK', 'EGY': 'EG',
    'EST': 'EE', 'FIN': 'FI', 'FRA': 'FR', 'GEO': 'GE', 'DEU': 'DE',
    'GER': 'DE', 'GBR': 'GB', 'GRE': 'GR', 'GRC': 'GR', 'HUN': 'HU',
    'IND': 'IN', 'IDN': 'ID', 'IRN': 'IR', 'IRI': 'IR', 'IRL': 'IE',
    'ISR': 'IL', 'ITA': 'IT', 'JPN': 'JP', 'JOR': 'JO', 'KAZ': 'KZ',
    'KEN': 'KE', 'KWT': 'KW', 'KGZ': 'KG', 'LAO': 'LA', 'LVA': 'LV',
    'LBN': 'LB', 'LTU': 'LT', 'LUX': 'LU', 'MAS': 'MY', 'MYS': 'MY',
    'MEX': 'MX', 'MDA': 'MD', 'MGL': 'MN', 'MNG': 'MN', 'MNE': 'ME',
    'MAR': 'MA', 'NAM': 'NA', 'NEP': 'NP', 'NED': 'NL', 'NLD': 'NL',
    'NZL': 'NZ', 'MKD': 'MK', 'NOR': 'NO', 'OMA': 'OM', 'OMN': 'OM',
    'PAK': 'PK', 'PSE': 'PS', 'PAN': 'PA', 'PER': 'PE', 'PHI': 'PH',
    'PHL': 'PH', 'POL': 'PL', 'POR': 'PT', 'PRT': 'PT', 'QAT': 'QA',
    'ROU': 'RO', 'RUS': 'RU', 'SAU': 'SA', 'SEN': 'SN', 'SRB': 'RS',
    'SGP': 'SG', 'SVK': 'SK', 'SVN': 'SI', 'SLO': 'SI', 'ZAF': 'ZA',
    'RSA': 'ZA', 'KOR': 'KR', 'ESP': 'ES', 'LKA': 'LK', 'SRI': 'LK',
    'SWE': 'SE', 'CHE': 'CH', 'SUI': 'CH', 'SYR': 'SY', 'TJK': 'TJ',
    'THA': 'TH', 'TUN': 'TN', 'TUR': 'TR', 'TKM': 'TM', 'UKR': 'UA',
    'ARE': 'AE', 'URY': 'UY', 'UZB': 'UZ', 'VEN': 'VE', 'VNM': 'VN',
    'ECU': 'EC', 'BRN': 'BN', 'CHN': 'CN',
}

ALPHA2_TO_SPORT = {
    'AF': 'AFG', 'AL': 'ALB', 'DZ': 'ALG', 'AD': 'AND', 'AO': 'ANG', 'AG': 'ANT',
    'AR': 'ARG', 'AM': 'ARM', 'AU': 'AUS', 'AT': 'AUT', 'AZ': 'AZE',
    'BS': 'BAH', 'BH': 'BRN', 'BD': 'BAN', 'BB': 'BAR', 'BY': 'BLR', 'BE': 'BEL',
    'BZ': 'BIZ', 'BJ': 'BEN', 'BT': 'BHU', 'BO': 'BOL', 'BA': 'BIH', 'BW': 'BOT',
    'BR': 'BRA', 'BN': 'BRU', 'BG': 'BUL', 'BF': 'BUR',
    'KH': 'CAM', 'CM': 'CMR', 'CA': 'CAN', 'CV': 'CPV', 'CF': 'CAF', 'TD': 'CHA',
    'CL': 'CHI', 'CN': 'CHN', 'CO': 'COL', 'KM': 'COM', 'CG': 'CGO', 'CD': 'COD',
    'CR': 'CRC', 'CI': 'CIV', 'HR': 'CRO', 'CU': 'CUB', 'CY': 'CYP', 'CZ': 'CZE',
    'DK': 'DEN', 'DJ': 'DJI', 'DO': 'DOM',
    'EC': 'ECU', 'EG': 'EGY', 'SV': 'ESA', 'ER': 'ERI', 'EE': 'EST', 'ET': 'ETH',
    'FJ': 'FIJ', 'FI': 'FIN', 'FR': 'FRA',
    'GA': 'GAB', 'GM': 'GAM', 'GE': 'GEO', 'DE': 'GER', 'GH': 'GHA', 'GB': 'GBR',
    'GR': 'GRE', 'GD': 'GRN', 'GT': 'GUA', 'GN': 'GUI', 'GW': 'GBS', 'GY': 'GUY',
    'HT': 'HAI', 'HN': 'HON', 'HK': 'HKG', 'HU': 'HUN',
    'IS': 'ISL', 'IN': 'IND', 'ID': 'INA', 'IR': 'IRI', 'IQ': 'IRQ', 'IE': 'IRL',
    'IL': 'ISR', 'IT': 'ITA',
    'JM': 'JAM', 'JP': 'JPN', 'JO': 'JOR',
    'KZ': 'KAZ', 'KE': 'KEN', 'KI': 'KIR', 'KP': 'PRK', 'KR': 'KOR', 'KW': 'KUW',
    'KG': 'KGZ',
    'LA': 'LAO', 'LV': 'LAT', 'LB': 'LIB', 'LS': 'LES', 'LR': 'LBR', 'LY': 'LBA',
    'LI': 'LIE', 'LT': 'LTU', 'LU': 'LUX',
    'MK': 'MKD', 'MG': 'MAD', 'MW': 'MAW', 'MY': 'MAS', 'MV': 'MDV', 'ML': 'MLI',
    'MT': 'MLT', 'MH': 'MHL', 'MR': 'MTN', 'MU': 'MRI', 'MX': 'MEX', 'FM': 'FSM',
    'MD': 'MDA', 'MC': 'MON', 'MN': 'MGL', 'ME': 'MNE', 'MA': 'MAR', 'MZ': 'MOZ',
    'MM': 'MYA',
    'NA': 'NAM', 'NR': 'NRU', 'NP': 'NEP', 'NL': 'NED', 'NZ': 'NZL', 'NI': 'NCA',
    'NE': 'NIG', 'NG': 'NGR', 'NO': 'NOR',
    'OM': 'OMA',
    'PK': 'PAK', 'PW': 'PLW', 'PA': 'PAN', 'PG': 'PNG', 'PY': 'PAR', 'PE': 'PER',
    'PH': 'PHI', 'PL': 'POL', 'PT': 'POR',
    'QA': 'QAT',
    'RO': 'ROU', 'RU': 'RUS', 'RW': 'RWA',
    'KN': 'SKN', 'LC': 'LCA', 'VC': 'VIN', 'WS': 'SAM', 'SM': 'SMR', 'ST': 'STP',
    'SA': 'KSA', 'SN': 'SEN', 'RS': 'SRB', 'SC': 'SEY', 'SL': 'SLE', 'SG': 'SGP',
    'SK': 'SVK', 'SI': 'SLO', 'SB': 'SOL', 'SO': 'SOM', 'ZA': 'RSA', 'SS': 'SSD',
    'ES': 'ESP', 'LK': 'SRI', 'SD': 'SUD', 'SR': 'SUR', 'SZ': 'SWZ', 'SE': 'SWE',
    'CH': 'SUI', 'SY': 'SYR',
    'TW': 'TPE', 'TJ': 'TJK', 'TZ': 'TAN', 'TH': 'THA', 'TL': 'TLS', 'TG': 'TOG',
    'TO': 'TGA', 'TT': 'TTO', 'TN': 'TUN', 'TR': 'TUR', 'TM': 'TKM',
    'UG': 'UGA', 'UA': 'UKR', 'AE': 'UAE', 'US': 'USA', 'UY': 'URU', 'UZ': 'UZB',
    'VU': 'VAN', 'VE': 'VEN', 'VN': 'VIE',
    'YE': 'YEM',
    'ZM': 'ZAM', 'ZW': 'ZIM',
    'XX': 'XXX', 'PS': 'PLE',
}


def normalize_country(raw):
    k = str(raw).strip().upper()
    if not k:
        return 'XXX'
    iso2 = ALIAS_TO_ISO2.get(k)
    if iso2:
        return ALPHA2_TO_SPORT.get(iso2, iso2)
    if len(k) == 2 and re.match(r'^[A-Z]{2}$', k):
        return ALPHA2_TO_SPORT.get(k, 'XXX')
    if len(k) == 3 and re.match(r'^[A-Z]{3}$', k):
        return k
    return 'XXX'


# ---------------------------------------------------------------------------
# REST helpers
# ---------------------------------------------------------------------------

REST = SUPABASE_URL + '/rest/v1'
RPC = SUPABASE_URL + '/rest/v1/rpc'

_session = requests.Session()
_session.headers.update({
    'apikey': SERVICE_ROLE_KEY,
    'Authorization': 'Bearer ' + SERVICE_ROLE_KEY,
    'Content-Type': 'application/json',
})


def _get(path, params=None):
    r = _session.get(REST + '/' + path, params=params, timeout=30)
    r.raise_for_status()
    return r.json()


def _select_one(table, select='id', **filters):
    params = {k: 'eq.' + str(v) for k, v in filters.items()}
    params['select'] = select
    params['limit'] = '1'
    r = _session.get(REST + '/' + table, params=params, timeout=30)
    r.raise_for_status()
    d = r.json()
    return d[0] if d else None


def _patch(table, body, **filters):
    params = {k: 'eq.' + str(v) for k, v in filters.items()}
    _session.patch(REST + '/' + table, json=body, params=params, timeout=30)


def _rpc(func, body):
    r = _session.post(RPC + '/' + func, json=body, timeout=60)
    if not r.ok:
        raise RuntimeError('RPC ' + func + ' ' + str(r.status_code) + ': ' + r.text[:200])
    return r.json()


# ---------------------------------------------------------------------------
# Header parsing
# ---------------------------------------------------------------------------

SYNONYMS = {
    'competition_label': 'unique_label',
    'competition_rang': 'rang_code',
    'competition_location': 'location',
    'competition_start_date': 'start_date',
    'competition_end_date': 'end_date',
    'finished_jump_rounds': 'finished_jump_rounds',
    'first_name': 'first_name',
    'last_name': 'last_name',
    'country_code': 'country_code',
    'gender': 'gender',
    'date_of_birth': 'date_of_birth',
    'fai_licence': 'fai_licence',
    'gdpr_consent': 'gdpr_consent',
    'publish_full_name': 'publish_full_name',
    'national_team_member': 'member_nt',
    'wpc_medalist': 'wpc_medalist',
    'jump_1': 'jump1_cm', 'jump_2': 'jump2_cm', 'jump_3': 'jump3_cm', 'jump_4': 'jump4_cm',
    'jump_5': 'jump5_cm', 'jump_6': 'jump6_cm', 'jump_7': 'jump7_cm', 'jump_8': 'jump8_cm',
    'sf_cm': 'sf_cm', 'f_cm': 'f_cm',
    'tb_1': 'tb1_cm', 'tb_2': 'tb2_cm', 'tb_3': 'tb3_cm',
    'tb_4': 'tb4_cm', 'tb_5': 'tb5_cm', 'tb_6': 'tb6_cm',
    'place_mf': 'place_overall',
    'place_m': 'place_m', 'place_f': 'place_f',
    'place_j': 'place_j', 'place_mj': 'place_mj', 'place_fj': 'place_fj',
    'place_master': 'place_master',
    'start_number': 'start_number',
    'team': 'team',
}

EXCEL_ERRORS = {'#N/A', '#VALUE!', '#REF!', '#DIV/0!', '#NUM!', '#NAME?', '#NULL!'}


def norm_hdr(h):
    h = str(h).strip().lower()
    h = re.sub(r'\s+', '_', h)
    h = re.sub(r'[^\w]', '', h)
    return h


def build_idx(header_row):
    idx = {}
    for i, h in enumerate(header_row):
        if not h:
            continue
        raw = norm_hdr(str(h))
        if not raw:
            continue
        key = SYNONYMS.get(raw, raw)
        idx[key] = i
    return idx


def cv(row, idx, key, default=''):
    i = idx.get(key)
    if i is None:
        return default
    v = row[i]
    if v is None:
        return default
    s = str(v).strip()
    return default if s in EXCEL_ERRORS else s


def parse_bool(raw):
    s = raw.strip().lower()
    if s in ('true', '1', 'yes', 'da'):
        return True
    if s in ('false', '0', 'no', 'ne', ''):
        return False
    return None


def parse_num(v):
    if v is None:
        return None
    s = str(v).strip().replace(',', '.')
    if not s:
        return None
    try:
        n = float(s)
        return None if (n != n) else n
    except (ValueError, TypeError):
        return None


def parse_date(v):
    if v is None:
        return None
    if hasattr(v, 'strftime'):
        return v.strftime('%Y-%m-%d')
    s = str(v).strip()
    if not s:
        return None
    if re.match(r'^\d{4}-\d{2}-\d{2}$', s):
        return s
    m = re.match(r'^(\d{1,2})[./](\d{1,2})[./](\d{4})$', s)
    if m:
        d, mo, y = m.group(1), m.group(2), m.group(3)
        return y + '-' + mo.zfill(2) + '-' + d.zfill(2)
    return None


def parse_place(v):
    n = parse_num(v)
    if n is None:
        return None
    i = round(n)
    return i if 0 < i <= 80 else None


# ---------------------------------------------------------------------------
# Competition resolve / create
# ---------------------------------------------------------------------------

_comp_cache = {}


def resolve_competition(row, idx):
    label = cv(row, idx, 'unique_label')
    if not label:
        return None
    if label in _comp_cache:
        return _comp_cache[label]

    existing = _select_one('competitions', select='id', unique_label=label)
    if existing:
        _comp_cache[label] = existing['id']
        return existing['id']

    location = cv(row, idx, 'location') or 'TBD'
    start = parse_date(row[idx['start_date']] if 'start_date' in idx else None)
    end = parse_date(row[idx['end_date']] if 'end_date' in idx else None)

    today = datetime.today().strftime('%Y-%m-%d')
    if not start and not end:
        start = end = today
    start = start or end
    end = end or start
    if start > end:
        end = start

    fr_raw = cv(row, idx, 'finished_jump_rounds')
    fr = max(0, round(float(fr_raw))) if fr_raw else 0

    rang = cv(row, idx, 'rang_code') or None

    body = {
        'unique_label': label,
        'name': label,
        'location': location,
        'start_date': start,
        'end_date': end,
        'finished_jump_rounds': fr,
    }
    if rang:
        body['competition_rang_code'] = rang

    # unique_label has a partial index so ON CONFLICT upsert won't work.
    # Use plain INSERT and handle duplicate gracefully.
    r = _session.post(
        REST + '/competitions',
        json=body,
        headers={'Prefer': 'return=representation'},
        timeout=30,
    )
    if r.ok:
        d = r.json()
        comp_id = (d[0] if isinstance(d, list) else d)['id']
        _comp_cache[label] = comp_id
        return comp_id

    # Already exists (duplicate key) - re-select
    if r.status_code in (409, 400) or '23505' in r.text or '42P10' in r.text:
        existing2 = _select_one('competitions', select='id', unique_label=label)
        if existing2:
            _comp_cache[label] = existing2['id']
            return existing2['id']

    raise RuntimeError('Competition insert failed ' + str(r.status_code) + ': ' + r.text[:300])


# ---------------------------------------------------------------------------
# Athlete resolve / create
# ---------------------------------------------------------------------------

_athlete_cache = {}


def resolve_athlete(display_name, sport_code, gender, dob, fai, gdpr_consent, gdpr_publish):
    key = (display_name.lower(), sport_code)
    if key in _athlete_cache:
        return _athlete_cache[key]

    params = {
        'display_name': 'ilike.' + display_name,
        'country_code': 'eq.' + sport_code,
        'select': 'id',
        'limit': '1',
    }
    r = _session.get(REST + '/athletes', params=params, timeout=30)
    r.raise_for_status()
    data = r.json()

    if data:
        athlete_id = data[0]['id']
        _athlete_cache[key] = athlete_id
        patch = {
            'gender': gender,
            'gdpr_consent_given': gdpr_consent,
            'gdpr_publish_full_name': gdpr_publish,
        }
        if dob:
            patch['date_of_birth'] = dob
        if fai is not None:
            patch['fai_licence'] = fai
        _patch('athletes', patch, id=athlete_id)
        return athlete_id

    body = {
        'display_name': display_name,
        'country_code': sport_code,
        'gender': gender,
        'gdpr_consent_given': gdpr_consent,
        'gdpr_publish_full_name': gdpr_publish,
    }
    if dob:
        body['date_of_birth'] = dob
    if fai:
        body['fai_licence'] = fai

    r2 = _session.post(
        REST + '/athletes',
        json=body,
        headers={'Prefer': 'return=representation'},
        timeout=30,
    )
    if not r2.ok:
        raise RuntimeError('Athlete insert failed ' + str(r2.status_code) + ': ' + r2.text[:200])
    ins = r2.json()
    athlete_id = (ins[0] if isinstance(ins, list) else ins)['id']
    _athlete_cache[key] = athlete_id
    return athlete_id


# ---------------------------------------------------------------------------
# Recalculation
# ---------------------------------------------------------------------------

def _recalc_result(result_id):
    try:
        _rpc('walar_recalculate_competition_result', {'p_id': result_id})
        return True
    except Exception as exc:
        print('    WARN recalc result ' + result_id + ': ' + str(exc), file=sys.stderr)
        return False


def _recalc_op(comp_id):
    try:
        _rpc('walar_recalculate_competition_organizer_points', {'p_competition_id': comp_id})
    except Exception as exc:
        print('    WARN recalc OP ' + comp_id + ': ' + str(exc), file=sys.stderr)


# ---------------------------------------------------------------------------
# Process one xlsx file
# ---------------------------------------------------------------------------

def process_file(path):
    fname = os.path.basename(path)
    result = {'file': fname, 'ok': 0, 'err': 0, 'errors': []}

    wb = openpyxl.load_workbook(path, data_only=True, read_only=True)
    ws = wb.active
    rows = list(ws.iter_rows(values_only=True))
    wb.close()

    if len(rows) < 2:
        result['errors'].append('No data rows')
        return result

    header = [str(h) if h is not None else '' for h in rows[0]]
    idx = build_idx(header)

    result_ids = []
    comp_ids_for_op = set()

    for ri, row in enumerate(rows[1:], start=2):
        if all(v is None or str(v).strip() == '' for v in row):
            continue
        try:
            comp_id = resolve_competition(row, idx)
            if not comp_id:
                result['errors'].append('Row ' + str(ri) + ': missing competition label')
                result['err'] += 1
                continue

            comp_ids_for_op.add(comp_id)

            rang = cv(row, idx, 'rang_code')
            if rang:
                _patch('competitions', {'competition_rang_code': rang}, id=comp_id)
            fr_raw = cv(row, idx, 'finished_jump_rounds')
            if fr_raw:
                try:
                    _patch('competitions', {'finished_jump_rounds': max(0, round(float(fr_raw)))}, id=comp_id)
                except ValueError:
                    pass

            first = cv(row, idx, 'first_name')
            last = cv(row, idx, 'last_name')
            display_name = (first + ' ' + last).strip()
            if not display_name:
                result['errors'].append('Row ' + str(ri) + ': empty athlete name')
                result['err'] += 1
                continue

            country_raw = cv(row, idx, 'country_code')
            sport_code = normalize_country(country_raw)

            gender = cv(row, idx, 'gender').upper()
            if gender not in ('M', 'F'):
                result['errors'].append('Row ' + str(ri) + ': invalid gender "' + gender + '"')
                result['err'] += 1
                continue

            gdpr_raw = cv(row, idx, 'gdpr_consent')
            gdpr_consent = parse_bool(gdpr_raw)
            if gdpr_consent is None:
                result['errors'].append('Row ' + str(ri) + ': invalid gdpr_consent "' + gdpr_raw + '"')
                result['err'] += 1
                continue

            pub_raw = cv(row, idx, 'publish_full_name')
            gdpr_publish = parse_bool(pub_raw) if pub_raw else False
            if gdpr_publish is None:
                gdpr_publish = False

            dob = parse_date(row[idx['date_of_birth']] if 'date_of_birth' in idx else None)
            fai = cv(row, idx, 'fai_licence') or None

            nt_raw = cv(row, idx, 'member_nt')
            member_nt = parse_bool(nt_raw) if nt_raw else False
            if member_nt is None:
                member_nt = False

            wpc_raw = cv(row, idx, 'wpc_medalist')
            wpc = parse_bool(wpc_raw) if wpc_raw else False
            if wpc is None:
                wpc = False

            athlete_id = resolve_athlete(
                display_name, sport_code, gender, dob, fai,
                gdpr_consent, bool(gdpr_publish),
            )
            if not athlete_id:
                result['errors'].append('Row ' + str(ri) + ': athlete resolve failed')
                result['err'] += 1
                continue

            def pn(key):
                raw = cv(row, idx, key)
                return parse_num(raw) if raw else None

            payload = {
                'competition_id': comp_id,
                'athlete_id': athlete_id,
                'member_national_team': member_nt,
                'wpc_medalist': wpc,
            }

            for f in ['jump1_cm', 'jump2_cm', 'jump3_cm', 'jump4_cm',
                      'jump5_cm', 'jump6_cm', 'jump7_cm', 'jump8_cm',
                      'sf_cm', 'f_cm',
                      'tb1_cm', 'tb2_cm', 'tb3_cm', 'tb4_cm', 'tb5_cm', 'tb6_cm']:
                v = pn(f)
                if v is not None:
                    payload[f] = v

            for f in ['place_overall', 'place_m', 'place_f', 'place_j',
                      'place_mj', 'place_fj', 'place_master']:
                v_raw = cv(row, idx, f)
                pv = parse_place(v_raw) if v_raw else None
                if pv is not None:
                    payload[f] = pv

            sn = cv(row, idx, 'start_number')
            if sn:
                payload['start_number'] = sn
            tm = cv(row, idx, 'team')
            if tm:
                payload['team'] = tm

            r_up = _session.post(
                REST + '/competition_results',
                json=payload,
                headers={'Prefer': 'return=representation,resolution=merge-duplicates'},
                params={'on_conflict': 'competition_id,athlete_id'},
                timeout=30,
            )
            if not r_up.ok:
                result['errors'].append('Row ' + str(ri) + ': result upsert ' + str(r_up.status_code) + ': ' + r_up.text[:200])
                result['err'] += 1
                continue

            ins_data = r_up.json()
            res_id = (ins_data[0] if isinstance(ins_data, list) else ins_data).get('id')
            if res_id:
                result_ids.append(res_id)
            result['ok'] += 1

        except Exception as exc:
            result['errors'].append('Row ' + str(ri) + ': ' + str(exc))
            result['err'] += 1

    if result_ids:
        with ThreadPoolExecutor(max_workers=RECALC_WORKERS) as ex:
            futs = {ex.submit(_recalc_result, rid): rid for rid in result_ids}
            for fut in as_completed(futs):
                try:
                    fut.result()
                except Exception:
                    pass

    for cid in comp_ids_for_op:
        _recalc_op(cid)

    return result


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    import_dir = os.path.abspath(IMPORT_DIR)
    if not os.path.isdir(import_dir):
        print('ERROR: IMPORT_DIR not found: ' + import_dir)
        sys.exit(1)

    files = sorted(f for f in os.listdir(import_dir) if f.endswith('.xlsx'))
    if not files:
        print('ERROR: no xlsx files in ' + import_dir)
        sys.exit(1)

    print('=' * 62)
    print('WALAR Bulk Import')
    print('  Source : ' + import_dir)
    print('  DB     : ' + SUPABASE_URL)
    print('  Files  : ' + str(len(files)))
    print('=' * 62)

    try:
        _get('competitions', {'select': 'id', 'limit': '1'})
        print('Connection OK\n')
    except Exception as e:
        print('Connection FAILED: ' + str(e))
        sys.exit(1)

    total_ok = total_err = 0
    all_errors = []
    t0 = time.time()

    for i, fname in enumerate(files, 1):
        path = os.path.join(import_dir, fname)
        print('[' + str(i).rjust(2) + '/' + str(len(files)) + '] ' + fname, end=' ... ', flush=True)
        t1 = time.time()
        res = process_file(path)
        elapsed = time.time() - t1
        print('ok=' + str(res['ok']) + ' err=' + str(res['err']) + ' (' + str(round(elapsed, 1)) + 's)')
        total_ok += res['ok']
        total_err += res['err']
        for e in res['errors'][:3]:
            print('    ! ' + e)
        if len(res['errors']) > 3:
            print('    ... and ' + str(len(res['errors']) - 3) + ' more')
        all_errors.extend((fname, e) for e in res['errors'])

    elapsed_total = time.time() - t0
    print()
    print('=' * 62)
    print('Finished in ' + str(round(elapsed_total)) + 's')
    print('  Rows imported : ' + str(total_ok))
    print('  Rows failed   : ' + str(total_err))
    print('=' * 62)

    if all_errors:
        log_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'walar_import_errors.log')
        with open(log_path, 'w', encoding='utf-8') as f:
            for fname, e in all_errors:
                f.write(fname + ': ' + e + '\n')
        print('\nErrors saved to: ' + log_path)


if __name__ == '__main__':
    main()
