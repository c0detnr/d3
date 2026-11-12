/** World +Z is north; angles are radians, speed is signed metres/second. */
export function headingDegrees(yaw: number) {
  return ((yaw * 180 / Math.PI) % 360 + 360) % 360;
}

export function headingLabel(yaw: number) {
  return String(Math.round(headingDegrees(yaw)) % 360).padStart(3, '0');
}

export function speedLabel(metresPerSecond: number) {
  return String(Math.round(Math.abs(metresPerSecond) * 3.6));
}

// One presentation surface, shared by independent telemetry and authoritative damage owners.
// No DOM is touched until a HUD is constructed (the numeric helpers remain usable in Node).
let vehiclePanel: HTMLElement | undefined;
const vehicleOwners = new Set<'telemetry' | 'damage'>();
export function acquireVehiclePanel(owner: 'telemetry' | 'damage', markup: () => string) {
  if (!vehiclePanel) {
    vehiclePanel = document.createElement('section');
    vehiclePanel.className = 'hud-vehicle vehicle-condition';
    vehiclePanel.innerHTML = markup();
    document.body.append(vehiclePanel);
  }
  const element = vehiclePanel;
  vehicleOwners.add(owner);
  element.dataset[owner] = 'true';
  return { element, release() {
    vehicleOwners.delete(owner);
    delete element.dataset[owner];
    if (owner === 'telemetry') element.querySelectorAll('[transform]').forEach(node => node.removeAttribute('transform'));
    if (owner === 'damage') {
      delete element.dataset.condition;
      element.querySelectorAll('[data-module]').forEach(node => { node.removeAttribute('class'); node.removeAttribute('aria-label'); });
    }
    if (!vehicleOwners.size) { element.remove(); vehiclePanel = undefined; }
  } };
}
