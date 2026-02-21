export class WidgetRegistry {
  constructor() {
    this.map = new Map();
  }
  register(kind, impl) { this.map.set(kind, impl); }
  get(kind) { return this.map.get(kind); }
}
