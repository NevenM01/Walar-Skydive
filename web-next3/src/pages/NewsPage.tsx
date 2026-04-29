import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight } from '@phosphor-icons/react'
import type { NewsPost } from '../types'
import { getNewsPosts } from '../lib/api'
import { Skeleton } from '../components/ui/Skeleton'
import { ErrorMessage } from '../components/shared/ErrorMessage'
import { EmptyState } from '../components/shared/EmptyState'

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en', { day: 'numeric', month: 'long', year: 'numeric' })
}

export default function NewsPage() {
  const [posts,   setPosts]   = useState<NewsPost[]>([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)

  const load = () => {
    setLoading(true)
    setError(null)
    getNewsPosts()
      .then(setPosts)
      .catch(e => setError(e instanceof Error ? e.message : 'Failed to load news.'))
      .finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  const featured = posts[0]
  const rest     = posts.slice(1)

  return (
    <div className="max-w-[90rem] mx-auto px-4 md:px-6 lg:px-10 py-10 md:py-16">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-10"
      >
        <p className="text-xs font-display font-semibold uppercase tracking-widest text-[var(--muted)] mb-2">Press &amp; Updates</p>
        <h1 className="font-display font-black text-4xl md:text-5xl tracking-tighter text-[var(--text-col)] leading-none">News</h1>
      </motion.div>

      {error && <ErrorMessage message={error} onRetry={load} />}

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-56 rounded-2xl" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-36 rounded-2xl" />)}
          </div>
        </div>
      ) : posts.length === 0 ? (
        <EmptyState title="No news yet" description="Check back soon for the latest updates." />
      ) : (
        <div className="space-y-6">
          {/* Featured — wide */}
          {featured && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55 }}
            >
              <Link
                to={`/news/${featured.id}`}
                className="group block rounded-2xl border border-[var(--border-col)] bg-[var(--surface)] p-8 hover:border-[var(--accent)]/40 hover:shadow-[0_6px_32px_-10px_rgba(0,0,0,0.1)] transition-all duration-200 active:scale-[0.995]"
              >
                <div className="flex flex-wrap items-center gap-3 mb-4">
                  <span className="px-2 py-0.5 rounded-md bg-[var(--accent-subtle)] text-[var(--accent)] text-xs font-display font-semibold">
                    {featured.category || 'News'}
                  </span>
                  <span className="text-xs text-[var(--muted)]">{formatDate(featured.publishedAt)}</span>
                  {featured.authorName && (
                    <span className="text-xs text-[var(--muted)]">by {featured.authorName}</span>
                  )}
                </div>
                <h2 className="font-display font-black text-2xl md:text-3xl tracking-tight text-[var(--text-col)] leading-snug mb-3 group-hover:text-[var(--accent)] transition-colors duration-150 max-w-[60ch]">
                  {featured.title}
                </h2>
                <p className="text-base text-[var(--muted)] leading-relaxed max-w-[65ch] line-clamp-3">{featured.excerpt}</p>
                <div className="mt-5 flex items-center gap-1.5 text-sm font-display font-semibold text-[var(--accent)]">
                  Read article <ArrowRight size={13} weight="bold" className="group-hover:translate-x-0.5 transition-transform duration-150" />
                </div>
              </Link>
            </motion.div>
          )}

          {/* Rest — asymmetric 2-column */}
          {rest.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {rest.map((post, i) => (
                <motion.div
                  key={post.id}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-20px' }}
                  transition={{ delay: i * 0.06, duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                >
                  <Link
                    to={`/news/${post.id}`}
                    className="group flex flex-col h-full rounded-2xl border border-[var(--border-col)] bg-[var(--surface)] p-6 hover:border-[var(--accent)]/40 hover:shadow-[0_4px_20px_-8px_rgba(0,0,0,0.08)] transition-all duration-200 active:scale-[0.99]"
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-xs font-display text-[var(--muted)]">{formatDate(post.publishedAt)}</span>
                      {post.category && (
                        <>
                          <span className="w-1 h-1 rounded-full bg-[var(--border-col)]" />
                          <span className="text-xs font-display text-[var(--muted)]">{post.category}</span>
                        </>
                      )}
                    </div>
                    <h3 className="font-display font-bold text-base tracking-tight text-[var(--text-col)] leading-snug mb-2 group-hover:text-[var(--accent)] transition-colors duration-150 flex-1">
                      {post.title}
                    </h3>
                    <p className="text-sm text-[var(--muted)] line-clamp-2 leading-relaxed">{post.excerpt}</p>
                  </Link>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
