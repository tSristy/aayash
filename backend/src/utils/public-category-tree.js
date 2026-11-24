'use strict';

/** Build an active category tree without changing its original sort order. */
function categoryTree(categories) {
  const nodes = new Map(categories.map((category) => [Number(category.id), category]));
  const children = new Map();

  for (const category of categories) {
    const parentId = Number(category.parent_id);
    if (!category.parent_id || !nodes.has(parentId)) continue;
    if (!children.has(parentId)) children.set(parentId, []);
    children.get(parentId).push(Number(category.id));
  }

  function descendants(id) {
    const visited = new Set();
    const pending = [Number(id)];

    while (pending.length) {
      const current = pending.pop();
      if (visited.has(current) || !nodes.has(current)) continue;
      visited.add(current);
      for (const childId of children.get(current) || []) pending.push(childId);
    }

    return [...visited];
  }

  return { nodes, children, descendants };
}

/** Count direct + descendant products and inherit the first real image when necessary. */
function enrichCategories(categories, summaries) {
  const tree = categoryTree(categories);
  const summaryById = new Map(summaries.map((item) => [Number(item.category_id), item]));

  return categories.map((category) => {
    const ids = tree.descendants(category.id);
    const ownCount = Number(summaryById.get(Number(category.id))?.product_count || 0);
    const count = ids.reduce((total, id) => (
      total + Number(summaryById.get(id)?.product_count || 0)
    ), 0);

    // Category cover takes precedence; otherwise use a genuine photo from a
    // product in this category or its children. No fake logo/emoji is generated.
    const cover = category.image_url || ids.map((id) => (
      summaryById.get(id)?.representative_image
    )).find(Boolean) || null;

    return {
      ...category,
      image_url: cover,
      product_count: count,
      own_product_count: ownCount,
    };
  });
}

/** Related suggestions may include sibling categories under the same parent. */
function siblingCategoryIds(categories, categoryId) {
  const tree = categoryTree(categories);
  const current = tree.nodes.get(Number(categoryId));
  if (!current) return [];

  const parentId = current.parent_id == null ? null : Number(current.parent_id);
  if (!parentId) return tree.descendants(current.id);

  return categories
    .filter((category) => Number(category.parent_id) === parentId)
    .flatMap((category) => tree.descendants(category.id));
}

module.exports = { categoryTree, enrichCategories, siblingCategoryIds };
