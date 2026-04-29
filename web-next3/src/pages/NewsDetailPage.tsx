import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, User } from '@phosphor-icons/react'
import type { NewsPost } from '../types'
import { getNewsPost } from '../lib/api'
import { Skeleton, SkeletonText } from '../components/ui/Skeleton'
import { ErrorMessage } from '../components/shared/ErrorMessage'

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

export default function NewsDetailPage() {
  const { id }    = useParams<{ id: string }>()
  const [post,    setPost]    = useState<NewsPost | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    getNewsPost(id)
      .then(setPost)
      .catch(e => setError(e instanceof Error ? e.message : 'Failed to load article.'))
      .finally(() => setLoading(false))
  }, [id])

  return (
    <div className="max-w-[90rem] mx-auto px-4 md:px-6 lg:px-10 py-10 md:py-16">
      <Link
        to="/news"
        className="inline-flex items-center gap-1.5 text-sm font-display text-[var(--muted)] hover:text-[var(--accent)] transition-colors duration-150 mb-8 group"
      >
        <ArrowLeft size={14} weight="bold" className="group-hover:-translate-x-0.5 transition-transform duration-150" />
        All news
      </Link>

      {error && <ErrorMessage message={error} />}

      {loading ? (
        <div className="max-w-[70ch] space-y-4">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-3/4" />
          <Skeleton className="h-4 w-40" />
          <div className="pt-4">
            <SkeletonText lines={6} />
          </div>
        </div>
      ) : !post ? (
        <p className="text-[var(--muted)]">Article not found.</p>
      ) : (
        <motion.article
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-[70ch]"
        >
          {/* Meta */}
          <div className="flex flex-wrap items-center gap-3 mb-5">
            {post.category && (
              <span className="px-2 py-0.5 rounded-md bg-[var(--accent-subtle)] text-[var(--accent)] text-xs font-display font-semibold">
                {post.category}
              </span>
            )}
            <time className="text-sm text-[var(--muted)]">{formatDate(post.publishedAt)}</time>
          </div>

          {/* Title */}
          <h1 className="font-display font-black text-3xl md:text-4xl tracking-tighter text-[var(--text-col)] leading-tight mb-4">
            {post.title}
          </h1>

          {/* Author */}
          {post.authorName && (
            <div className="flex items-center gap-2 mb-8 pb-6 border-b border-[var(--border-col)]">
              <div className="w-7 h-7 rounded-full bg-[var(--border-col)] flex items-center justify-center">
                <User size={14} weight="bold" className="text-[var(--muted)]" />
              </div>
              <span className="text-sm font-display text-[var(--muted)]">{post.authorName}</span>
            </div>
          )}

          {/* Excerpt */}
          {post.excerpt && (
            <p className="text-base font-medium text-[var(--text-col)] leading-relaxed mb-6 opacity-80">
              {post.excerpt}
            </p>
          )}

          {/* Body */}
          {post.body ? (
            <div className="prose-sm text-[var(--text-col)] leading-relaxed space-y-4 text-base">
              {post.body.split('\n\n').map((para, i) => (
                <p key={i} className="leading-[1.75]">{para}</p>
              ))}
            </div>
          ) : (
            <p className="text-[var(--muted)] italic">No content available.</p>
          )}

          {/* Images */}
          {post.imageUrls && post.imageUrls.length > 0 && (
            <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {post.imageUrls.map((url, i) => (
                <img
                  key={i}
                  src={url}
                  alt={`Image ${i + 1}`}
                  className="rounded-xl w-full object-cover aspect-video border border-[var(--border-col)]"
                  loading="lazy"
                />
              ))}
            </div>
          )}
        </motion.article>
      )}
    </div>
  )
}
