/**
 * P121-TWO004-TOASTOVERSAVE — a toast does not land on an open drawer's footer.
 *
 * Toasts stack at the bottom right, and every drawer puts its footer there with its main button (Create, Save) at the
 * right end. After "Trigger created." the toast sat over "Run now" and "Save" (`elementFromPoint` at Save's centre hit
 * the toast) for 4.5 s, and an error toast, the one a person reads while fixing the form, for 12 s. The stack now
 * rises above an open drawer's (or a modal's) footer.
 *
 * jsdom lays nothing out, so the footer's place on the screen is stubbed: what is graded is that the host reads it and
 * lifts the stack clear of it, and leaves the stack where the stylesheet puts it when no footer is open.
 */
import { mount, unmount, settle, q } from './dom';

import { ToastHost, toast } from '../../src/admin/app/ui/toast';

function footerAt(top: number, cls = 'drawer-foot'): HTMLElement {
  const foot = document.createElement('div');
  foot.className = cls;
  foot.getBoundingClientRect = () => ({ top, bottom: top + 56, left: 300, right: window.innerWidth, width: window.innerWidth - 300, height: 56, x: 300, y: top, toJSON: () => ({}) }) as DOMRect;
  document.body.appendChild(foot);
  return foot;
}

describe('P121-TWO004-TOASTOVERSAVE — a toast clears an open footer', () => {
  it('with a drawer open, the stack sits above its footer', async () => {
    const foot = footerAt(window.innerHeight - 56);
    const root = mount(<ToastHost />);
    toast('Trigger created.', 'ok');
    await settle();
    expect(q(root, '#toasts').style.bottom).toBe('64px');
    unmount(root);
    foot.remove();
  });

  it('a modal’s footer counts the same', async () => {
    const modal = document.createElement('div');
    modal.className = 'modal';
    document.body.appendChild(modal);
    const foot = footerAt(window.innerHeight - 100, 'foot');
    modal.appendChild(foot);
    const root = mount(<ToastHost />);
    toast('Could not save.', 'bad');
    await settle();
    expect(q(root, '#toasts').style.bottom).toBe('108px');
    unmount(root);
    modal.remove();
  });

  it('with nothing open, the stylesheet places it (no inline lift)', async () => {
    const root = mount(<ToastHost />);
    toast('Saved.', 'ok');
    await settle();
    expect(q(root, '#toasts').style.bottom).toBe('');
    unmount(root);
  });
});
