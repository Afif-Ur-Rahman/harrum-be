export const getCombinedOrder = (order: any) => {
  const allItems = order.orders.flatMap((group: any) => group.subOrder || []);
  const productMap = new Map<string, any>();

  for (const item of allItems) {
    const productName = item.productName;
    const variantKey = item.variant?.name;

    if (!productName || !variantKey) continue;

    if (!productMap.has(productName)) {
      productMap.set(productName, {
        productName,
        items: [],
      });
    }

    const productEntry = productMap.get(productName);

    const existingVariant = productEntry.items.find((v: any) => v.variant.name === variantKey);

    if (existingVariant) {
      existingVariant.quantity += item.quantity;
      existingVariant.itemTotal += item.itemTotal;
    } else {
      productEntry.items.push({
        variant: {
          name: item.variant.name,
          price: item.variant.price,
        },
        quantity: item.quantity,
        itemTotal: item.itemTotal,
      });
    }
  }

  return {
    ...order,
    combined: Array.from(productMap.values()),
  };
};
