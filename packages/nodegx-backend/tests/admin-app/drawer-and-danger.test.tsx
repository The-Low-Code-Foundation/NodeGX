/**
 * BMG-001 AC6 — `Drawer` (Esc, focus) and `DangerZone` (refuses without the typed name).
 */
import { mount, unmount, typeInto, press, click, q, qa, text, document, window } from './dom';

import { Drawer } from '../../src/admin/app/composers/Drawer';
import { DangerAction, DangerZone } from '../../src/admin/app/composers/DangerZone';
import { ModalHost } from '../../src/admin/app/ui/modal';

describe('Drawer (BMG-001 §3.5.5)', () => {
  it('takes focus on open, traps Tab inside, closes on Esc, and gives focus back', () => {
    const outside = document.createElement('button');
    outside.textContent = 'outside';
    document.body.appendChild(outside);
    outside.focus();
    expect(document.activeElement).toBe(outside);

    let closed = 0;
    const root = mount(
      <Drawer title="Edit Pet" onClose={() => closed++} footer={<button type="button">Save</button>}>
        <input type="text" aria-label="name" />
        <input type="text" aria-label="age" />
      </Drawer>
    );
    const [name, age] = qa<HTMLInputElement>(root, 'input');
    expect(document.activeElement).toBe(name);

    // Tab from the last focusable wraps to the first; Shift+Tab from the first wraps to the last.
    const save = q<HTMLButtonElement>(root, '.drawer-foot button');
    save.focus();
    press(window, 'Tab');
    expect(document.activeElement).toBe(q(root, '.drawer-head button'));
    q(root, '.drawer-head button').focus();
    press(window, 'Tab', { shiftKey: true });
    expect(document.activeElement).toBe(save);
    age.focus();
    expect(document.activeElement).toBe(age);

    press(window, 'Escape');
    expect(closed).toBe(1);
    unmount(root);
    expect(document.activeElement).toBe(outside);
    outside.remove();
  });
});

describe('DangerZone (BMG-001 §3.5.6)', () => {
  it('refuses until the exact name is typed, then confirms once', () => {
    let confirmed = 0;
    const root = mount(
      <>
        <ModalHost />
        <DangerZone>
          <DangerAction
            label="Delete collection"
            why="Every record in Pet is destroyed."
            title="Delete collection Pet"
            warning="Every record in Pet is destroyed along with the collection."
            expected="Pet"
            onConfirm={() => confirmed++}
          />
        </DangerZone>
      </>
    );
    expect(text(q(root, '.danger-zone-title'))).toBe('Danger zone');
    click(q(root, '.danger-action button'));
    const dialog = q(root, '.modal');
    expect(text(q(dialog, 'h3'))).toBe('Delete collection Pet');
    const go = qa<HTMLButtonElement>(dialog, '.foot button').find((b) => text(b) === 'Delete collection')!;
    expect(go.disabled).toBe(true);
    const input = q<HTMLInputElement>(dialog, 'input');
    typeInto(input, 'pet');
    expect(go.disabled).toBe(true);
    click(go);
    expect(confirmed).toBe(0);
    typeInto(input, 'Pet');
    expect(go.disabled).toBe(false);
    click(go);
    expect(confirmed).toBe(1);
    expect(root.querySelector('.modal')).toBeNull();
    unmount(root);
  });
});
