import { WidgetKinds } from './types.js';

export function instantiateAe11Layers(registry) {
  Object.values(WidgetKinds).forEach((kind) => registry.register(kind, { kind }));
  return Object.values(WidgetKinds);
}
