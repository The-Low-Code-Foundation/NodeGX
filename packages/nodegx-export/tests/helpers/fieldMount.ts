/**
 * P18-S116-FIELDMOUNT. A rendered text input whose Value reaches a chain announces it as the page mounts: a guarded
 * mount effect (`const announced = useRef(false); useEffect(() => { if (announced.current) return; … }, []);`). A row
 * that is about something else on the page (a branch, a timer's ref, a node's effect) reads the page without it.
 */
export const withoutAnnouncement = (file: string): string =>
  file.replace(/\n {2}\/\/ .* announces its Value as it mounts.*\n(?: {2}.*\n)*? {2}\}, \[\]\);\n/g, '\n');
