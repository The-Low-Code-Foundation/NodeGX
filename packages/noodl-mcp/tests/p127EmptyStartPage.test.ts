/**
 * P127-BKO006-EMPTYSTARTPAGE — at the door: an empty page written as a stub never takes home from another empty page.
 *
 * The book club's agent wrote its pages as stubs first (a Navigate to a page that does not exist is refused):
 * `create_component Pages/Club` answered startPage /Pages/Club, then `Pages/My Books` answered startPage
 * /Pages/My Books, "The app opens on My Books." The empty start page counted as the placeholder, and so did each stub.
 */
import * as fs from 'fs';

import { call, connect, copyFixture, TestSession } from './helpers';

interface Written {
  registeredPages?: { router: string; added: string[]; startPage?: string };
}

const stub = (path: string, title: string) => ({
  path,
  nodes: [{ id: title.toLowerCase().replace(/\W+/g, '-') + '-page', type: 'Page', parameters: { title } }],
  connections: []
});

describe('P127-BKO006-EMPTYSTARTPAGE — writing stubs first does not move home each time', () => {
  let dir: string;
  let session: TestSession;

  beforeEach(async () => {
    dir = copyFixture();
    session = await connect(dir);
  });

  afterEach(async () => {
    await session.close();
    fs.rmSync(dir, { recursive: true, force: true });
  });

  const startPage = () => {
    const app = session.store.readComponent('App').files;
    const router = app.nodes.nodes.find((n) => n.type === 'Router');
    return (router?.parameters?.pages as { startPage?: string } | undefined)?.startPage;
  };

  it('the second stub leaves home on the first', async () => {
    const club = await call<Written>(session, 'create_component', stub('Pages/Club', 'Club'));
    expect(club.isError).toBe(false);
    expect(startPage()).toBe('/Pages/Club'); // the router had none: the first page opens the app

    const books = await call<Written>(session, 'create_component', stub('Pages/My Books', 'My Books'));
    expect(books.isError).toBe(false);
    expect(books.data.registeredPages?.added).toEqual(['/Pages/My Books']);
    expect(books.data.registeredPages?.startPage).toBeUndefined();
    expect(startPage()).toBe('/Pages/Club');
  });

  it('control: a page with something in it still takes home from an empty one', async () => {
    await call(session, 'create_component', stub('Pages/Club', 'Club'));
    const shelf = await call<Written>(session, 'create_component', {
      path: 'Pages/Shelf',
      nodes: [
        { id: 'shelf-page', type: 'Page', parameters: { title: 'Shelf' } },
        { id: 'shelf-col', type: 'Group', parent: 'shelf-page' },
        { id: 'shelf-t', type: 'Text', parent: 'shelf-col', parameters: { text: 'Your books' } }
      ],
      connections: []
    });
    expect(shelf.isError).toBe(false);
    expect(shelf.data.registeredPages?.startPage).toBe('/Pages/Shelf');
    expect(startPage()).toBe('/Pages/Shelf');
  });
});
