import { lazy, Suspense } from 'react'
import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom'
import { RequireAdmin } from '../components/auth/RequireAdmin'
import { RequireAuth } from '../components/auth/RequireAuth'
import { PageLayout } from '../components/layout/PageLayout'
import { AdminShell } from '../components/layout/AdminShell'

const HomePage = lazy(() => import('../pages/HomePage'))
const ResultsPage = lazy(() => import('../pages/ResultsPage'))
const EventsPage = lazy(() => import('../pages/EventsPage'))
const EventDetailPage = lazy(() => import('../pages/EventDetailPage'))
const AthletePage = lazy(() => import('../pages/AthletePage'))
const NewsPage = lazy(() => import('../pages/NewsPage'))
const NewsDetailPage = lazy(() => import('../pages/NewsDetailPage'))
const PartnersPage = lazy(() => import('../pages/PartnersPage'))
const BecomePartnerPage = lazy(() => import('../pages/BecomePartnerPage'))
const RulesPage = lazy(() => import('../pages/RulesPage'))
const LoginPage = lazy(() => import('../pages/LoginPage'))
const RequestAccessPage = lazy(() => import('../pages/RequestAccessPage'))
const AccountPage = lazy(() => import('../pages/AccountPage'))
const AdminAthletesPage = lazy(() => import('../pages/admin/AdminAthletesPage'))
const AdminCompetitionsPage = lazy(() => import('../pages/admin/AdminCompetitionsPage'))
const AdminCsvPage = lazy(() => import('../pages/admin/AdminCsvPage'))
const AdminRankingPage = lazy(() => import('../pages/admin/AdminRankingPage'))
const AdminNewsPage = lazy(() => import('../pages/admin/AdminNewsPage'))
const AdminPartnersPage = lazy(() => import('../pages/admin/AdminPartnersPage'))
const AdminPartnerInquiriesPage = lazy(() => import('../pages/admin/AdminPartnerInquiriesPage'))
const AdminProfileRequestsPage = lazy(() => import('../pages/admin/AdminProfileRequestsPage'))
const AdminDuplicatesPage = lazy(() => import('../pages/admin/AdminDuplicatesPage'))

function PageFallback() {
  return (
    <div className="min-h-[60dvh] flex items-center justify-center">
      <div className="w-8 h-8 rounded-full border-2 border-[var(--border-col)] border-t-[var(--accent)] animate-spin" />
    </div>
  )
}

const router = createBrowserRouter([
  {
    path: '/',
    element: <PageLayout />,
    children: [
      { index: true, element: <Suspense fallback={<PageFallback />}><HomePage /></Suspense> },
      { path: 'results', element: <Suspense fallback={<PageFallback />}><ResultsPage /></Suspense> },
      { path: 'events', element: <Suspense fallback={<PageFallback />}><EventsPage /></Suspense> },
      { path: 'events/:id', element: <Suspense fallback={<PageFallback />}><EventDetailPage /></Suspense> },
      { path: 'athlete/:id', element: <Suspense fallback={<PageFallback />}><AthletePage /></Suspense> },
      { path: 'news', element: <Suspense fallback={<PageFallback />}><NewsPage /></Suspense> },
      { path: 'news/:id', element: <Suspense fallback={<PageFallback />}><NewsDetailPage /></Suspense> },
      { path: 'partners', element: <Suspense fallback={<PageFallback />}><PartnersPage /></Suspense> },
      {
        path: 'partners/become-a-partner',
        element: (
          <Suspense fallback={<PageFallback />}>
            <BecomePartnerPage />
          </Suspense>
        ),
      },
      { path: 'rules', element: <Suspense fallback={<PageFallback />}><RulesPage /></Suspense> },
      { path: 'login', element: <Suspense fallback={<PageFallback />}><LoginPage /></Suspense> },
      { path: 'request-access', element: <Suspense fallback={<PageFallback />}><RequestAccessPage /></Suspense> },
      { path: 'register', element: <Navigate to="/request-access" replace /> },
      {
        element: <RequireAuth />,
        children: [
          { path: 'account', element: <Suspense fallback={<PageFallback />}><AccountPage /></Suspense> },
        ],
      },
    ],
  },
  {
    path: '/admin',
    element: <RequireAdmin />,
    children: [
      {
        element: <AdminShell />,
        children: [
          { index: true, element: <Navigate to="athletes" replace /> },
          { path: 'athletes', element: <Suspense fallback={<PageFallback />}><AdminAthletesPage /></Suspense> },
          { path: 'competitions', element: <Suspense fallback={<PageFallback />}><AdminCompetitionsPage /></Suspense> },
          { path: 'csv', element: <Suspense fallback={<PageFallback />}><AdminCsvPage /></Suspense> },
          { path: 'ranking', element: <Suspense fallback={<PageFallback />}><AdminRankingPage /></Suspense> },
          { path: 'duplicates', element: <Suspense fallback={<PageFallback />}><AdminDuplicatesPage /></Suspense> },
          { path: 'requests', element: <Suspense fallback={<PageFallback />}><AdminProfileRequestsPage /></Suspense> },
          { path: 'news', element: <Suspense fallback={<PageFallback />}><AdminNewsPage /></Suspense> },
          { path: 'partners', element: <Suspense fallback={<PageFallback />}><AdminPartnersPage /></Suspense> },
          {
            path: 'partner-inquiries',
            element: (
              <Suspense fallback={<PageFallback />}>
                <AdminPartnerInquiriesPage />
              </Suspense>
            ),
          },
          { path: '*', element: <Navigate to="/admin/athletes" replace /> },
        ],
      },
    ],
  },
])

export function AppRouter() {
  return <RouterProvider router={router} />
}
