# 🎨 Surugaya-Vue 樣式指南

> 本專案使用 **Tailwind CSS v4** + 傳統 CSS 的混合方案，確保易於維護和修改

## 📋 目錄

- [配色管理](#配色管理)
- [組件樣式規範](#組件樣式規範)
- [如何修改配色](#如何修改配色)
- [按鈕系統](#按鈕系統)

---

## 📦 已完成組件重構清單

### ✅ 完全使用 Tailwind CSS 的組件

以下組件已完全改用 Tailwind CSS 類別，無傳統 CSS：

1. **BaseButton.vue** - 基礎按鈕組件
   - 使用 `:class` 動態綁定
   - 預設內距 `px-4 py-2`
   - 外部可用 `p-0!` 覆蓋

2. **RefreshButton.vue** - 重新整理按鈕
   - 使用 `p-0!` 強制覆蓋內距
   - Tailwind v4 語法正確

3. **AddUrlButton.vue** - 新增 URL 按鈕
   - 使用 `p-0!` 強制覆蓋內距
   - 完全 Tailwind 化

4. **WishList.vue Header 區域** - 願望清單標題、標籤、控制區
   - **主標題區**: `bg-white rounded-xl shadow-sm mb-5 p-5`
   - **標籤導航**: 使用 `bg-linear-to-br` 漸層（Tailwind v4）
   - **控制區**: 排序、搜尋、篩選、工具列全部 Tailwind 化
   - **載入/錯誤狀態**: 完全使用 Tailwind 類別

### 🔄 部分使用傳統 CSS 的組件

以下組件仍有傳統 CSS，但已優化：

1. **WishList.vue**
   - Header 已完全 Tailwind 化
   - 商品網格（`.product-grid`）仍使用傳統 CSS（因複雜的響應式佈局）
   - 回到頂部按鈕仍使用傳統 CSS

2. **ProductCard.vue**
   - 尚未全面重構
   - 待處理

---

## 🎨 配色管理

### 配色定義位置

所有配色都在 `src/style.css` 中以 **CSS 變數**定義：

```css
@theme {
  /* 主要配色 - 淺藍色系 */
  --color-primary-50: #f0f9ff;
  --color-primary-100: #e0f2fe;
  /* ... */
  
  /* 次要配色 - 淡紫色系 */
  --color-secondary-50: #faf5ff;
  /* ... */
  
  /* 功能色 */
  --color-success-500: #22c55e;
  --color-danger-500: #ef4444;
  --color-warning-500: #f97316;
}
```

### 色彩層級說明

- **50-100**: 非常淺的背景色
- **200-300**: 淺色，用於 hover 狀態
- **400-600**: 主色調（500 是標準色）
- **700-900**: 深色，用於文字或 active 狀態

---

## 🧩 組件樣式規範

### 1. 小型組件（按鈕、圖標等）

✅ **直接使用 Tailwind 類別**

```vue
<template>
  <button class="px-4 py-2 bg-primary-500 text-white rounded-lg">
    點擊我
  </button>
</template>
```

### 2. 大型組件（卡片、列表等）

✅ **使用 `<style scoped>` + 傳統 CSS**

```vue
<style scoped>
.product-card {
  display: flex;
  gap: 8px;
  padding: 12px;
  border: 1px solid var(--color-primary-100);
  background-color: var(--color-primary-50);
}
</style>
```

### 3. 動態樣式

✅ **使用計算屬性返回 Tailwind 類別**

```vue
<script setup>
const buttonClasses = computed(() => {
  return [
    'px-4',
    'py-2',
    props.variant === 'primary' ? 'bg-primary-500' : 'bg-neutral-500'
  ].join(' ')
})
</script>
```

---

## 🔧 如何修改配色

### 方案 A：修改現有配色（推薦）

只需修改 `src/style.css` 中的 CSS 變數：

```css
@theme {
  /* 將藍色改為綠色 */
  --color-primary-500: #10b981; /* 原本是 #0ea5e9 */
}
```

**全站自動更新！** ✨

### 方案 B：新增配色主題

1. 在 `src/style.css` 添加新的 CSS 變數：

```css
@theme {
  --color-brand-500: #ff6b6b;
  --color-brand-600: #ee5a5a;
}
```

2. 在組件中使用：

```vue
<button class="bg-brand-500 hover:bg-brand-600">
  新按鈕
</button>
```

---

## 🔘 按鈕系統

### BaseButton 組件

**位置**: `src/components/common/BaseButton.vue`

**變體**：
- `default`: 灰白色，適用於一般操作
- `primary`: 橙色漸層，適用於主要操作
- `danger`: 紅色，適用於刪除操作

**使用方式**：

```vue
<BaseButton variant="primary" @click="handleClick">
  確認
</BaseButton>
```

**覆蓋樣式**：

```vue
<!-- 使用 ! 後綴強制覆蓋 -->
<BaseButton 
  variant="default"
  class="w-12 h-12 p-0!"
>
  +
</BaseButton>
```

### RefreshButton 組件

刷新按鈕，固定尺寸 36x36px，帶旋轉動畫

```vue
<RefreshButton :loading="isLoading" @refresh="handleRefresh" />
```

### AddUrlButton 組件

新增網址按鈕，帶彈出輸入框

```vue
<AddUrlButton 
  :adding="isAdding"
  :errorMessage="error"
  @add="handleAddUrl"
/>
```

---

## 📝 樣式命名規範

### CSS 類別命名

- **BEM 命名法**（用於傳統 CSS）
  ```css
  .product-card { }
  .product-card__title { }
  .product-card--selected { }
  ```

- **語義化命名**（優先考慮功能而非外觀）
  ```css
  /* ✅ 好 */
  .btn-submit { }
  .status-active { }
  
  /* ❌ 避免 */
  .blue-button { }
  .big-text { }
  ```

### Tailwind 類別順序

建議順序（提高可讀性）：

```vue
<div class="
  /* 布局 */
  flex items-center gap-2
  
  /* 尺寸 */
  w-full h-12
  
  /* 間距 */
  p-4 m-2
  
  /* 外觀 */
  bg-white border border-neutral-200 rounded-lg
  
  /* 文字 */
  text-sm font-medium text-neutral-700
  
  /* 互動 */
  hover:bg-neutral-50 transition-all
">
```

---

## 🚀 最佳實踐

### ✅ DO

1. **統一使用 CSS 變數管理顏色**
2. **小組件用 Tailwind，大組件用 scoped CSS**
3. **使用語義化的變數名稱**
4. **保持類別順序一致**

### ❌ DON'T

1. **不要在組件中硬編碼顏色值**（如 `#ff0000`）
2. **不要混用 `@apply` 和內聯類別**（選擇一種）
3. **不要過度使用 `!important` 或 `!` 後綴**
4. **不要在全域 CSS 中寫過於具體的選擇器**

---

## 🔍 常見問題

### Q: 為什麼按鈕跑版了？

A: 檢查是否有衝突的 padding 類別。BaseButton 預設有 `px-4 py-2`，如果需要覆蓋，使用 `!` 後綴：

```vue
<BaseButton class="p-0!">
```

### Q: Tailwind 類別不生效？

A: 確認：
1. 類別名稱是否正確（v4 語法）
2. 是否在 `@theme` 中定義了該顏色
3. 檢查是否有更高優先級的 CSS 覆蓋

### Q: 如何快速改變整站配色？

A: 只需修改 `src/style.css` 中的 `@theme` 區塊，所有使用該色彩變數的地方都會自動更新！

---

## 📚 參考資源

- [Tailwind CSS v4 文檔](https://tailwindcss.com/docs)
- [Vue 3 Style Guide](https://vuejs.org/style-guide/)
- [BEM 命名規範](http://getbem.com/)

---

**最後更新**: 2025年12月2日  
**維護者**: Surugaya-Vue 團隊
