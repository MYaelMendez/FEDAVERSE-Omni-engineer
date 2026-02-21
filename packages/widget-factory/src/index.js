import { WidgetRegistry, instantiateAe11Layers } from '@ae11/runtime';

export function createFactoryRegistry() {
  const registry = new WidgetRegistry();
  instantiateAe11Layers(registry);
  return registry;
}
