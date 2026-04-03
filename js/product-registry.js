export const PRODUCT_REGISTRY = {
  '6ft-throw': 'standard-6ft-throw',
  '8ft-throw': 'standard-8ft-throw'
};

export function resolveProductId(productKey) {
  if (!productKey) {
    return null;
  }

  return PRODUCT_REGISTRY[productKey] || productKey;
}
