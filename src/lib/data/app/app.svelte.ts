import { createQuery, queryOptions } from '@tanstack/svelte-query'
import { getLatestAppRelease } from '$remote/app.remote'
import { Version } from '$lib/utils/version'

const latestAppReleaseQueryKey = ['app', 'release'] as const

function latestAppReleaseQuery() {
  return queryOptions({
    queryKey: latestAppReleaseQueryKey,
    queryFn: async () => {
      const result = await getLatestAppRelease()

      if (!result.success) {
        throw new Error(result.error)
      }

      return {
        downloadUrl: result.data.downloadUrl,
        version: Version.from(result.data.version)
      }
    }
  })
}

export function useLatestAppRelease() {
  const query = createQuery(() => latestAppReleaseQuery())

  return {
    get loading() {
      return query.isPending
    },

    get value() {
      return query.data ?? null
    }
  }
}
