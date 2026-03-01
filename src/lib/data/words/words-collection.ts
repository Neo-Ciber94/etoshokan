import { createCollection } from '$lib/common/isomorphic-box';
import { z } from 'zod';
import type { WordEntry } from '$lib/dictionary/core/dictionary';

export const DEFAULT_CATEGORY = '⭐ Common';

export const storedCategorySchema = z.object({
  id: z.string(),
  category: z.string(),
  words: z.array(z.string())
});

export type StoredCategory = z.infer<typeof storedCategorySchema>;

export const wordsCollection = createCollection({
  schema: storedCategorySchema,
  actions(ctx) {
    return {
      getCategories() {
        return ctx.adapter.query(ctx, {
          select: (x) => x.category
        });
      },

      getAll() {
        return ctx.adapter.getAll(ctx);
      },

      async isSaved(id: string) {
        const all = await ctx.adapter.getAll(ctx);
        return all.some((c) => c.words.some((w) => w === id));
      },

      async addCategory(category: string) {
        const existing = await ctx.adapter.first(ctx, (x) => x.category === category);

        if (existing) {
          return existing.id;
        }

        const result = await ctx.adapter.set({ category, words: [] }, ctx);
        return result.id;
      },

      async save(entry: WordEntry, category = DEFAULT_CATEGORY) {
        const all = await ctx.adapter.getAll(ctx);

        for (const cat of all) {
          if (cat.words.includes(entry.id)) {
            await ctx.adapter.updateWith(ctx, cat.id, (prev) => ({
              ...prev,
              words: prev.words.filter((w) => w !== entry.id)
            }));
          }
        }

        const categoryId = await this.addCategory(category);
        await ctx.adapter.updateWith(ctx, categoryId, (prev) => ({
          ...prev,
          words: [...prev.words, entry.id]
        }));
      },

      async delete(id: string) {
        const all = await ctx.adapter.getAll(ctx);

        for (const cat of all) {
          if (cat.words.includes(id)) {
            await ctx.adapter.updateWith(ctx, cat.id, (prev) => ({
              ...prev,
              words: prev.words.filter((w) => w !== id)
            }));
          }
        }
      },

      async renameCategory(oldName: string, newName: string) {
        if (oldName === newName) {
          return;
        }

        const existing = await ctx.adapter.first(ctx, (x) => x.category === newName);
        if (existing) {
          return;
        }

        const cat = await ctx.adapter.first(ctx, (x) => x.category === oldName);
        if (!cat) {
          return;
        }

        await ctx.adapter.update({ ...cat, category: newName }, ctx);
      },

      async deleteCategory(name: string) {
        if (name === DEFAULT_CATEGORY) {
          return;
        }

        const cat = await ctx.adapter.first(ctx, (x) => x.category === name);
        if (!cat) {
          return;
        }

        await ctx.adapter.remove(cat.id, ctx);
      }
    };
  }
});
