// 用途分類對照表
export const CATEGORY_MAP = {
  0: '未分類',
  1: '購買',
  2: '考慮',
  3: '購物車'
}

// 根據 purposeCategoryId 取得顯示文字
export const getCategoryText = (categoryId) => {
  return CATEGORY_MAP[categoryId ?? 0] ?? '未分類'
}

// 取得所有分類 ID
export const getCategoryIds = () => {
  return Object.keys(CATEGORY_MAP).map(id => parseInt(id))
}

// 驗證分類 ID 是否有效
export const isValidCategoryId = (categoryId) => {
  return getCategoryIds().includes(categoryId)
}
