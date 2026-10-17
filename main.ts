import './style.css';
import { createPreview } from './preview';
import { SeedSchema } from './random';

function requiredElement<T extends Element>(selector: string, constructor: { new (): T }): T {
  const element = document.querySelector(selector);
  if (!(element instanceof constructor)) throw new Error('The preview document is incomplete.');
  return element;
}

const viewport = requiredElement('#viewport', HTMLDivElement);
const form = requiredElement('#controls', HTMLFormElement);
const seedInput = requiredElement('#seed', HTMLInputElement);
const reset = requiredElement('#reset', HTMLButtonElement);
const status = requiredElement('#status', HTMLParagraphElement);
const diagnostics = requiredElement('#diagnostics', HTMLOutputElement);

try {
  const preview = createPreview(viewport);
  const controller = new AbortController();
  const generate = () => {
    const result = SeedSchema.safeParse(
      seedInput.value.trim() === '' ? undefined : Number(seedInput.value),
    );
    if (!result.success) {
      status.textContent = 'Enter a whole-number seed between -2147483648 and 2147483647.';
      return;
    }
    const metrics = preview.generate(result.data);
    diagnostics.value = `${String(metrics.calls)} draw call · ${String(metrics.triangles)} triangles`;
    diagnostics.dataset['resources'] = JSON.stringify(metrics);
    status.textContent = `Ready · seed ${String(result.data)}`;
  };
  form.addEventListener(
    'submit',
    (event) => {
      event.preventDefault();
      generate();
    },
    { signal: controller.signal },
  );
  reset.addEventListener(
    'click',
    () => {
      seedInput.value = '42';
      generate();
    },
    { signal: controller.signal },
  );
  const dispose = () => {
    controller.abort();
    preview.dispose();
  };
  window.addEventListener(
    'pagehide',
    (event) => {
      if (!event.persisted) dispose();
    },
    { signal: controller.signal },
  );
  import.meta.hot?.dispose(dispose);
  generate();
} catch {
  status.textContent = 'The 3D preview could not start. Try a browser with WebGL enabled.';
  form.querySelectorAll('button').forEach((button) => {
    button.disabled = true;
  });
}
