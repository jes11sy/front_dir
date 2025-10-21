/**
 * Skeleton loader для карточек
 */

'use client'

import React from 'react'

interface SkeletonCardProps {
  count?: number
}

const SkeletonCard = React.memo<SkeletonCardProps>(({ count = 1 }) => {
  return (
    <>
      {[...Array(count)].map((_, i) => (
        <div key={i} className="bg-gray-800 rounded-lg p-4 space-y-3 animate-pulse">
          <div className="h-6 bg-gray-700 rounded w-3/4"></div>
          <div className="h-4 bg-gray-700 rounded w-1/2"></div>
          <div className="h-4 bg-gray-700 rounded w-2/3"></div>
          <div className="h-4 bg-gray-700 rounded w-1/3"></div>
        </div>
      ))}
    </>
  )
})

SkeletonCard.displayName = 'SkeletonCard'

export default SkeletonCard

