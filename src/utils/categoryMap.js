// 用途分類對照表
export const CATEGORY_MAP = {
  0: '未分類',
  1: '購買',
  2: '考慮',
  3: '購物車'
}

// 分類 ID 對應的英文路由名稱
export const CATEGORY_ROUTE_MAP = {
  0: 'uncategorized',
  1: 'purchase',
  2: 'consider',
  3: 'cart'
}

// 英文路由名稱對應的分類 ID
export const ROUTE_CATEGORY_MAP = {
  'uncategorized': 0,
  'purchase': 1,
  'consider': 2,
  'cart': 3
}

// 根據 purposeCategoryId 取得顯示文字
export const getCategoryText = (categoryId) => {
  return CATEGORY_MAP[categoryId ?? 0] ?? '未分類'
}

// 根據分類 ID 取得英文路由名稱
export const getCategoryRoute = (categoryId) => {
  return CATEGORY_ROUTE_MAP[categoryId ?? 0] ?? 'uncategorized'
}

// 根據英文路由名稱取得分類 ID
export const getCategoryIdFromRoute = (routeName) => {
  return ROUTE_CATEGORY_MAP[routeName] ?? null
}

// 取得所有分類 ID
export const getCategoryIds = () => {
  return Object.keys(CATEGORY_MAP).map(id => parseInt(id))
}

// 驗證分類 ID 是否有效
export const isValidCategoryId = (categoryId) => {
  return getCategoryIds().includes(categoryId)
}
