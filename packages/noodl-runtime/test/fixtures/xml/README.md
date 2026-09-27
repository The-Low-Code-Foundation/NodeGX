# XML fixtures (FED-001)

- `attributes-and-mixed.xml` — AC4's round trip: attributes beside text, a repeated element,
  CDATA, an escaped entity, a namespaced element, an empty element.
- `entity-bomb.xml` — AC3. A billion-laughs expansion. Safe to read: `scanForHostileConstructs`
  refuses it on the text, before `fast-xml-parser` is handed a byte.

**The over-size document of AC3 is generated in the test, not committed.** Six megabytes of
`<a/>` in git is six megabytes in every clone forever and it says nothing this line does not.
