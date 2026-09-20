// @ts-check
/**
 * Digital Bricks lesson kit — a NodeGX node kit (TASK-L155, sprint 44).
 *
 * One React node per member of the product's closed section palette — the 19
 * kinds `section.schema.ts` enumerates — plus `Section`, which takes a whole
 * section object and switches on its `kind`, so a `For Each` over a lesson's
 * `sections` array draws the lesson. The switch is the same exhaustive one
 * `LessonRenderer.tsx` has; a kind with no renderer throws by name.
 *
 * ── The safety boundary ─────────────────────────────────────────────────────
 *
 * AI content is DATA and these nodes are the only thing that turns it into UI.
 * Nothing here renders a string except through:
 *   - `ReactMarkdown` + `rehype-sanitize` (+ `remark-gfm`) — the ONE markdown
 *     path, bundled above this file as `DbtMarkdown`, the same three modules
 *     the product's `Markdown.tsx` uses;
 *   - `DOMPurify` with the SVG profile — the product's `sanitise.ts`, for
 *     `svg_diagram.svg` and `annotated_screenshot.overlaySvg`;
 *   - React's own text escaping.
 * There is no `dangerouslySetInnerHTML` outside `sanitiseSvg`'s two callers.
 *
 * ── Ports are the product; nothing here fetches ─────────────────────────────
 *
 * Every field of a kind's schema is a port. Nothing calls a model and nothing
 * POSTs anywhere: the kinds that in the product write to a server (capture,
 * prep_pack, artifact_challenge, handover_pack, quiz's open forms, voice,
 * audio's TTS) render their ASK and emit an output the graph wires — to a
 * Cloud Function when the backend lands, to a Log until then. A node emits; the
 * graph decides where it goes.
 *
 * ── The coaching invariants, kept ───────────────────────────────────────────
 *
 * A wrong answer is warm, never red, never ✗. `correct` is an output for the
 * graph, never a count on screen. Nothing gates. `--warm` is encouragement and
 * human recording; `--go` is done. Every colour is a CLASS the stylesheet owns;
 * there is no colour in this file.
 *
 * ── Copy ────────────────────────────────────────────────────────────────────
 *
 * i18n is the port evaluation's unscoped gap. The learner-facing strings below
 * are the product's English catalogue (`src/i18n/en/lesson.json`) in ONE place,
 * so a string table can replace them in one edit. They are deliberately not 60
 * ports.
 */
(function () {
  // React is a global the runtime installs before this file runs. Read it bare;
  // never `window.React` — a server render has no `window`.
  var R = typeof React !== 'undefined' ? React : null;
  var h = R ? R.createElement : null;
  /** The bundle above this source, when present (absent in a bare test). */
  var MD = typeof DbtMarkdown !== 'undefined' ? DbtMarkdown : null;

  var KIT = 'dbt-lesson';

  var COPY = {
    shortAnswer: 'The short answer',
    moreDetail: 'More detail',
    tryAgain: 'Try again',
    tones: { jargon: 'what this means for you', tip: 'tip', warning: 'watch out', reassurance: 'good to know' },
    quizTrue: 'True',
    quizFalse: 'False',
    quizPlaceholder: 'Type your answer here…',
    quizSubmit: 'Submit answer',
    sayItBackPlaceholder: 'Say it back in one sentence…',
    sayItBackSubmit: 'Submit',
    quizSent: 'Sent. The reading of your answer arrives here once a backend is connected.',
    activityPlaceholder: 'Your answer…',
    activitySave: 'Save to my project',
    activitySaved: '✓ Saved to your project — future lessons will know this.',
    capturePlaceholder: 'Your answer…',
    captureSave: 'Save to my project',
    captureSaved: '✓ Saved to your project',
    captureEdit: 'Edit',
    prepCopy: 'Copy',
    prepCopied: 'Copied!',
    prepDownload: 'Download .md',
    prepMissing: 'Not captured yet — it’s above in this lesson.',
    prepMissingDoc: 'NOT YET PROVIDED — ask the trainer',
    artifactRubric: 'What a good one shows',
    artifactPaste: 'Paste what you built',
    artifactPlaceholder: 'Paste it here.',
    artifactSubmit: 'Bring it back',
    artifactSent: 'Sent. The reading against each criterion arrives here once a backend is connected.',
    artifactRevise: 'Revise and send it again',
    handoverFiles: 'What {product} will write for you',
    handoverWrite: 'Write these for me',
    handoverNeeds: 'Writing these reads your whole project, which needs the backend — this button asks for it.',
    videoPlays: 'Plays from {label}. ',
    videoOpen: 'Open it there instead ↗',
    videoWatch: 'Watch the video',
    videoInvalid: 'This video link isn’t working. Your coach can fix it.',
    recordedForYou: 'Recorded for you',
    listen: '🔊 Listen to this section',
    transcript: 'Read transcript',
    voiceRecord: '🎤 Record answer',
    voiceOr: 'or type it below',
    voiceRecording: 'Recording…',
    voiceStop: 'Stop',
    voicePlaceholder: 'Type your answer here if you prefer…',
    voiceSubmit: 'Submit answer',
    deferredMermaid: 'Diagram source. Drawing it needs the Mermaid library, which this kit does not bundle yet (README).',
    deferredChart: 'Chart data. Drawing it needs a chart library, which this kit does not bundle yet (README).',
    deferredWidget: 'Interactive widget',
    deferredWidgetNote: 'One of five interactive components not yet in this kit (README). Its settings are below.',
    deferredImage: 'The image lives at this storage key. The backend that serves it is not connected yet, so nothing loads here.'
  };

  // ── Helpers ─────────────────────────────────────────────────────────────────

  /** A value that should be an object or array, whether it arrived as one or as JSON text. */
  function data(v, fallback) {
    if (v === null || v === undefined || v === '') return fallback;
    if (typeof v === 'string') {
      try {
        return JSON.parse(v);
      } catch (e) {
        return fallback;
      }
    }
    return v;
  }

  function str(v) {
    return v === null || v === undefined ? '' : String(v);
  }

  function fill(template, values) {
    return template.replace(/\{(\w+)\}/g, function (m, k) {
      return values[k] === undefined ? m : values[k];
    });
  }

  /** Every `<a>` the markdown path renders opens elsewhere and refers nobody (the product's SafeLink). */
  function SafeLink(props) {
    // react-markdown hands its hast `node` as a prop; spread onto <a> it renders
    // as node="[object Object]" (seen on the drive). Dropped, never spread.
    var p = Object.assign({}, props, { target: '_blank', rel: 'noopener noreferrer nofollow' });
    delete p.node;
    return h('a', p, props.children);
  }

  /** THE ONE MARKDOWN PATH. Every prose field goes through here. */
  function md(text, className) {
    var body = str(text);
    if (!MD) return h('div', { className: className }, body);
    return h(
      'div',
      { className: className },
      h(
        MD.ReactMarkdown,
        { rehypePlugins: [MD.rehypeSanitize], remarkPlugins: [MD.remarkGfm], components: { a: SafeLink } },
        body
      )
    );
  }

  /** The product's `sanitiseSvg`, verbatim in its options. Empty where there is no DOM. */
  function sanitiseSvg(svg) {
    if (!MD || !MD.DOMPurify || typeof window === 'undefined' || !MD.DOMPurify.isSupported) return '';
    return MD.DOMPurify.sanitize(str(svg), {
      USE_PROFILES: { svg: true, svgFilters: true },
      FORBID_TAGS: ['script', 'object', 'embed', 'link', 'meta', 'foreignObject'],
      FORBID_ATTR: ['onload', 'onerror', 'onclick', 'onmouseover', 'onmouseout', 'onfocus']
    });
  }

  /** The bridge hands the node's own CSS in `props.style` and the node in `props.noodlNode`; the root applies both. */
  function useRoot(props) {
    var el = R.useRef(null);
    R.useEffect(function () {
      if (props.noodlNode && el.current) props.noodlNode.setDOMElement(el.current);
    });
    return el;
  }

  function emit(props, name, value) {
    if (typeof props[name] === 'function') props[name](value);
  }

  /** Asset URL from a storage key — the base is a PORT, never a constant. */
  function assetUrl(props, key) {
    var base = str(props.assetBase || '/api/assets/');
    return base + encodeURIComponent(str(key));
  }

  function humaniseField(field) {
    var parts = str(field).split('.');
    var name = parts[parts.length - 1] || '';
    var words = name.replace(/([A-Z])/g, ' $1').trim();
    return words.charAt(0).toUpperCase() + words.slice(1);
  }

  // ── Renderers: one per kind. Each is a React component taking the section's fields as props. ──

  function Reading(p) {
    var detail = str(p.detail).trim();
    return h(
      'div',
      { className: 'reading' },
      md(p.markdown),
      detail
        ? h(
            'details',
            { className: 'reading-detail' },
            h('summary', { className: 'reading-detail-summary' }, COPY.moreDetail),
            h('div', { className: 'reading-detail-body' }, md(detail))
          )
        : null
    );
  }

  function Callout(p) {
    var tone = COPY.tones[p.tone] ? p.tone : 'tip';
    return h(
      'aside',
      { className: 'dbt-callout tone-' + tone },
      h('span', { className: 'dbt-callout-chip' }, COPY.tones[tone]),
      md(p.markdown, 'callout-body')
    );
  }

  function AnswerCapsule(p) {
    return h(
      'div',
      { className: 'dbt-capsule' },
      h('p', { className: 'dbt-capsule-label' }, COPY.shortAnswer),
      h('p', { className: 'dbt-capsule-text' }, str(p.text))
    );
  }

  function CodeBlock(p) {
    return h(
      'div',
      { className: 'dbt-code' },
      h('div', { className: 'dbt-code-head' }, h('span', { className: 'dbt-code-lang' }, str(p.language))),
      h('pre', { className: 'dbt-code-pre' }, h('code', null, str(p.code))),
      str(p.explanation) ? md(p.explanation, 'dbt-code-explain') : null
    );
  }

  /**
   * Quiz. mcq and true_false are graded HERE from the section's own `correct`
   * (the product does the same, client-side). open_response and say_it_back
   * emit the learner's words; the reading is the graph's to fetch.
   */
  function Quiz(p) {
    var variant = data(p.variant, {}) || {};
    var type = variant.type;
    var state = R.useState({ selected: null, text: '', sent: false });
    var s = state[0];
    var set = state[1];

    function answered(isCorrect, answerText) {
      // Answering IS the action, right or wrong (L60). Correctness is a port, never a count on screen.
      emit(p, 'onAnswer', answerText);
      emit(p, 'onCorrect', !!isCorrect);
      emit(p, 'onAnswered');
      emit(p, 'onAction');
    }

    var retry = h(
      'button',
      {
        type: 'button',
        className: 'dbt-btn-quiet',
        onClick: function () {
          set({ selected: null, text: '', sent: false });
        }
      },
      COPY.tryAgain
    );

    var body;
    if (type === 'mcq') {
      var options = data(variant.options, []) || [];
      var isAnswered = s.selected !== null;
      body = h(
        'div',
        { className: 'dbt-quiz-options' },
        options.map(function (opt, i) {
          var isSelected = s.selected === i;
          var cls = 'dbt-quiz-option' + (isAnswered ? ' is-answered' : '') + (isSelected ? (opt.correct ? ' is-go' : ' is-warm') : '');
          return h(
            'button',
            {
              key: i,
              type: 'button',
              className: cls,
              onClick: function () {
                if (isAnswered) return;
                set(Object.assign({}, s, { selected: i }));
                answered(!!opt.correct, str(opt.text));
              }
            },
            h('span', null, str(opt.text)),
            isSelected
              ? h('div', { className: 'dbt-quiz-feedback' + (opt.correct ? ' is-go' : '') }, (opt.correct ? '✓ ' : '') + str(opt.feedback))
              : null
          );
        }),
        isAnswered ? retry : null
      );
    } else if (type === 'true_false') {
      var tfAnswered = s.selected !== null;
      var tfCorrect = tfAnswered && s.selected === !!variant.correct;
      body = h(
        'div',
        { className: 'dbt-quiz-options' },
        h(
          'div',
          { className: 'dbt-quiz-row' },
          [true, false].map(function (value) {
            var isSelected = s.selected === value;
            var optCorrect = value === !!variant.correct;
            var cls = 'dbt-quiz-option' + (tfAnswered ? ' is-answered' : '') + (isSelected ? (optCorrect ? ' is-go' : ' is-warm') : '');
            return h(
              'button',
              {
                key: String(value),
                type: 'button',
                className: cls,
                onClick: function () {
                  if (tfAnswered) return;
                  set(Object.assign({}, s, { selected: value }));
                  answered(optCorrect, value ? COPY.quizTrue : COPY.quizFalse);
                }
              },
              value ? COPY.quizTrue : COPY.quizFalse
            );
          })
        ),
        tfAnswered ? h('p', { className: 'dbt-quiz-feedback' + (tfCorrect ? ' is-go' : '') }, (tfCorrect ? '✓ ' : '') + str(variant.feedback)) : null,
        tfAnswered ? retry : null
      );
    } else {
      // open_response and say_it_back: the words go out on a port.
      var sayItBack = type === 'say_it_back';
      body = s.sent
        ? h('div', null, h('p', { className: 'dbt-sent' }, COPY.quizSent), retry)
        : h(
            'div',
            null,
            h('textarea', {
              className: 'dbt-quiz-textarea',
              value: s.text,
              placeholder: sayItBack ? COPY.sayItBackPlaceholder : COPY.quizPlaceholder,
              onChange: function (e) {
                set(Object.assign({}, s, { text: e.target.value }));
              }
            }),
            h(
              'button',
              {
                type: 'button',
                className: 'dbt-btn',
                disabled: !s.text.trim(),
                onClick: function () {
                  var t = s.text.trim();
                  if (!t) return;
                  set(Object.assign({}, s, { sent: true }));
                  answered(false, t);
                }
              },
              sayItBack ? COPY.sayItBackSubmit : COPY.quizSubmit
            )
          );
    }

    return h('div', { className: 'dbt-quiz dbt-quiz-' + str(type) }, h('p', { className: 'dbt-quiz-question' }, str(p.question)), body);
  }

  function Activity(p) {
    var steps = data(p.steps, []) || [];
    var capture = data(p.capturesProjectFact, null);
    var doneState = R.useState({});
    var done = doneState[0];
    var factState = R.useState({ text: '', saved: false });
    var fact = factState[0];

    return h(
      'div',
      { className: 'dbt-activity' },
      h('p', { className: 'dbt-activity-title' }, str(p.title)),
      h(
        'ol',
        { className: 'dbt-activity-steps' },
        steps.map(function (step, i) {
          var isDone = !!done[i];
          return h(
            'li',
            {
              key: i,
              className: 'dbt-activity-step' + (isDone ? ' is-done' : ''),
              onClick: function () {
                // Working through the activity is the action; ONE step counts (L60).
                var next = Object.assign({}, done);
                next[i] = !isDone;
                doneState[1](next);
                emit(p, 'onAction');
              }
            },
            h('span', { className: 'dbt-activity-num' }, isDone ? '✓' : String(i + 1)),
            h('div', { className: 'dbt-activity-text' }, md(step, 'step-md'))
          );
        })
      ),
      capture
        ? h(
            'div',
            { className: 'dbt-activity-fact' },
            md(capture.prompt, 'dbt-activity-fact-prompt'),
            fact.saved
              ? h('p', { className: 'dbt-sent' }, COPY.activitySaved)
              : h(
                  'div',
                  null,
                  h('textarea', {
                    className: 'dbt-textarea',
                    value: fact.text,
                    placeholder: COPY.activityPlaceholder,
                    onChange: function (e) {
                      factState[1]({ text: e.target.value, saved: false });
                    }
                  }),
                  h(
                    'button',
                    {
                      type: 'button',
                      className: 'dbt-btn',
                      disabled: !fact.text.trim(),
                      onClick: function () {
                        var v = fact.text.trim();
                        if (!v) return;
                        factState[1]({ text: v, saved: true });
                        emit(p, 'onSaveField', str(capture.field));
                        emit(p, 'onSaveValue', v);
                        emit(p, 'onSave');
                        emit(p, 'onAction');
                      }
                    },
                    COPY.activitySave
                  )
                )
          )
        : null
    );
  }

  function Capture(p) {
    var facts = data(p.facts, {}) || {};
    var initial = str(p.initialValue) || str(facts[str(p.field)]);
    var st = R.useState({ text: initial, saved: initial, editing: !initial });
    var s = st[0];
    var set = st[1];

    return h(
      'div',
      { className: 'capture-box' },
      md(p.prompt, 'capture-prompt'),
      !s.editing && s.saved
        ? h(
            'div',
            { className: 'capture-saved' },
            h(
              'div',
              null,
              h('p', { className: 'capture-saved-value' }, s.saved),
              h('span', { className: 'capture-saved-check' }, COPY.captureSaved)
            ),
            h(
              'button',
              {
                type: 'button',
                className: 'capture-edit-btn',
                onClick: function () {
                  set(Object.assign({}, s, { editing: true, text: s.saved }));
                }
              },
              COPY.captureEdit
            )
          )
        : h(
            'div',
            { className: 'capture-row' },
            h('textarea', {
              className: 'capture-input',
              rows: 3,
              value: s.text,
              placeholder: str(p.hint) || COPY.capturePlaceholder,
              onChange: function (e) {
                set(Object.assign({}, s, { text: e.target.value }));
              }
            }),
            h(
              'button',
              {
                type: 'button',
                className: 'capture-save-btn',
                disabled: !s.text.trim(),
                onClick: function () {
                  var v = s.text.trim();
                  if (!v) return;
                  set({ text: v, saved: v, editing: false });
                  emit(p, 'onSaveField', str(p.field));
                  emit(p, 'onSaveValue', v);
                  emit(p, 'onSave');
                  emit(p, 'onAction');
                }
              },
              COPY.captureSave
            )
          )
    );
  }

  function PrepPack(p) {
    var facts = data(p.facts, {}) || {};
    var fields = data(p.factFields, []) || [];
    var copied = R.useState(false);

    function assemble() {
      var lines = ['# ' + str(p.title), '', str(p.instructions), ''];
      fields.forEach(function (f) {
        var v = str(facts[f]).trim();
        lines.push('## ' + humaniseField(f));
        lines.push(v || COPY.prepMissingDoc);
        lines.push('');
      });
      return lines.join('\n');
    }

    return h(
      'div',
      { className: 'prep-pack' },
      h('h3', { className: 'prep-pack-title' }, str(p.title)),
      md(p.instructions, 'prep-pack-instructions'),
      h(
        'dl',
        { className: 'prep-pack-fields' },
        fields.map(function (f) {
          var v = str(facts[f]).trim();
          return h('div', { className: 'prep-pack-field', key: f }, h('dt', null, humaniseField(f)), v ? h('dd', null, v) : h('dd', { className: 'prep-pack-missing' }, COPY.prepMissing));
        })
      ),
      h(
        'div',
        { className: 'prep-pack-actions' },
        h(
          'button',
          {
            type: 'button',
            className: 'btn btn-thread',
            onClick: function () {
              var text = assemble();
              emit(p, 'onPack', text);
              emit(p, 'onCopy');
              emit(p, 'onAction');
              if (typeof navigator !== 'undefined' && navigator.clipboard) {
                navigator.clipboard.writeText(text).then(function () {
                  copied[1](true);
                });
              }
            }
          },
          COPY.prepCopy
        ),
        h(
          'button',
          {
            type: 'button',
            className: 'btn btn-quiet',
            onClick: function () {
              var text = assemble();
              emit(p, 'onPack', text);
              if (typeof document === 'undefined') return;
              var a = document.createElement('a');
              a.href = 'data:text/markdown;charset=utf-8,' + encodeURIComponent(text);
              a.download = 'prep-pack.md';
              a.click();
            }
          },
          COPY.prepDownload
        ),
        copied[0] ? h('span', { className: 'prep-pack-copied' }, COPY.prepCopied) : null
      )
    );
  }

  function ArtifactChallenge(p) {
    var rubric = data(p.rubric, []) || [];
    var st = R.useState({ text: '', sent: false });
    var s = st[0];
    var set = st[1];
    return h(
      'div',
      { className: 'artifact-challenge' },
      h('h3', { className: 'artifact-challenge-title' }, str(p.title)),
      md(p.brief, 'artifact-challenge-brief'),
      h(
        'div',
        { className: 'artifact-rubric' },
        h('p', { className: 'artifact-rubric-label' }, COPY.artifactRubric),
        h(
          'ul',
          { className: 'artifact-rubric-list' },
          rubric.map(function (c, i) {
            return h('li', { key: i }, str(c));
          })
        )
      ),
      s.sent
        ? h(
            'div',
            { className: 'artifact-composer-actions' },
            h('p', { className: 'dbt-sent' }, COPY.artifactSent),
            h(
              'button',
              {
                type: 'button',
                className: 'btn btn-thread',
                onClick: function () {
                  set(Object.assign({}, s, { sent: false }));
                }
              },
              COPY.artifactRevise
            )
          )
        : h(
            'div',
            { className: 'artifact-composer' },
            h('label', { className: 'artifact-composer-label' }, COPY.artifactPaste),
            h('textarea', {
              className: 'artifact-textarea',
              rows: 8,
              value: s.text,
              placeholder: COPY.artifactPlaceholder,
              onChange: function (e) {
                set(Object.assign({}, s, { text: e.target.value }));
              }
            }),
            h(
              'div',
              { className: 'artifact-composer-actions' },
              h(
                'button',
                {
                  type: 'button',
                  className: 'btn btn-thread',
                  disabled: !s.text.trim(),
                  onClick: function () {
                    var t = s.text.trim();
                    if (!t) return;
                    set({ text: t, sent: true });
                    emit(p, 'onSubmitContent', t);
                    emit(p, 'onSubmit');
                    emit(p, 'onAction');
                  }
                },
                COPY.artifactSubmit
              )
            )
          )
    );
  }

  function HandoverPack(p) {
    var files = data(p.files, []) || [];
    return h(
      'div',
      { className: 'handover-pack' },
      h('h3', { className: 'handover-pack-title' }, str(p.title)),
      md(p.intro, 'handover-pack-intro'),
      h('p', { className: 'handover-pack-files-label' }, fill(COPY.handoverFiles, { product: str(p.productName) || 'Digital Bricks Training' })),
      h(
        'ul',
        { className: 'handover-pack-files' },
        files.map(function (f, i) {
          return h('li', { className: 'handover-pack-file', key: i }, h('span', { className: 'handover-pack-path' }, str(f.path)), h('span', { className: 'handover-pack-purpose' }, str(f.purpose)));
        })
      ),
      h(
        'div',
        { className: 'handover-pack-actions' },
        h(
          'button',
          {
            type: 'button',
            className: 'btn btn-thread',
            onClick: function () {
              emit(p, 'onWrite');
              emit(p, 'onAction');
            }
          },
          COPY.handoverWrite
        )
      ),
      h('p', { className: 'handover-pack-where' }, COPY.handoverNeeds)
    );
  }

  // ── The video allowlist — the product's `media/embed.ts`, ported verbatim in its rules. ──

  var YOUTUBE_HOSTS = { 'youtube.com': 1, 'www.youtube.com': 1, 'm.youtube.com': 1, 'youtube-nocookie.com': 1, 'www.youtube-nocookie.com': 1 };
  var YOUTU_BE_HOSTS = { 'youtu.be': 1, 'www.youtu.be': 1 };
  var VIMEO_HOSTS = { 'vimeo.com': 1, 'www.vimeo.com': 1, 'player.vimeo.com': 1 };
  var LOOM_HOSTS = { 'loom.com': 1, 'www.loom.com': 1 };
  var YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;
  var VIMEO_ID = /^[0-9]{6,12}$/;
  var LOOM_ID = /^[A-Za-z0-9]{16,64}$/;

  function whole(v) {
    var n = Number(v);
    return isFinite(n) && n >= 0 ? Math.floor(n) : null;
  }

  function resolveEmbed(url, startSeconds, endSeconds) {
    var u;
    try {
      u = new URL(str(url).trim());
    } catch (e) {
      return { kind: 'invalid' };
    }
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return { kind: 'invalid' };
    var host = u.hostname.toLowerCase();
    var segments = u.pathname.split('/').filter(Boolean);
    var provider = null;
    var id = null;
    if (YOUTU_BE_HOSTS[host]) {
      id = segments[0];
      if (id && YOUTUBE_ID.test(id)) provider = 'youtube';
    } else if (YOUTUBE_HOSTS[host]) {
      var v = u.searchParams.get('v');
      var path = ['embed', 'v', 'shorts', 'live'].indexOf(segments[0] || '') >= 0 ? segments[1] : null;
      id = v || path;
      if (id && YOUTUBE_ID.test(id)) provider = 'youtube';
    } else if (VIMEO_HOSTS[host]) {
      id = segments.filter(function (s) {
        return VIMEO_ID.test(s);
      })[0];
      if (id) provider = 'vimeo';
    } else if (LOOM_HOSTS[host]) {
      id = ['share', 'embed'].indexOf(segments[0] || '') >= 0 ? segments[1] : null;
      if (id && LOOM_ID.test(id)) provider = 'loom';
    }
    if (!provider) return { kind: 'link', href: u.toString() };

    var start = whole(startSeconds);
    var end = whole(endSeconds);
    var realEnd = end !== null && start !== null && end <= start ? null : end;
    var embedUrl;
    var label;
    if (provider === 'youtube') {
      label = 'YouTube';
      var params = new URLSearchParams({ rel: '0' });
      if (start !== null && start > 0) params.set('start', String(start));
      if (realEnd !== null && realEnd > 0) params.set('end', String(realEnd));
      embedUrl = 'https://www.youtube-nocookie.com/embed/' + id + '?' + params.toString();
    } else if (provider === 'vimeo') {
      label = 'Vimeo';
      embedUrl = 'https://player.vimeo.com/video/' + id + '?dnt=1' + (start !== null && start > 0 ? '#t=' + start + 's' : '');
    } else {
      label = 'Loom';
      embedUrl = 'https://www.loom.com/embed/' + id + (start !== null && start > 0 ? '?t=' + start : '');
    }
    return { kind: 'embed', provider: provider, label: label, embedUrl: embedUrl, href: u.toString() };
  }

  function formatTime(seconds) {
    var s = Math.floor(seconds);
    return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
  }

  function CuratedVideo(p) {
    var r = resolveEmbed(p.url, p.startSeconds, p.endSeconds);
    var start = Number(p.startSeconds);
    var end = Number(p.endSeconds);
    var range = isFinite(start) && isFinite(end) && end > start ? ' (' + formatTime(start) + ' – ' + formatTime(end) + ')' : '';
    var link = { className: 'dbt-link', target: '_blank', rel: 'noopener noreferrer nofollow' };
    return h(
      'div',
      { className: 'dbt-video' },
      h('p', { className: 'dbt-video-context' }, str(p.whyItMatters)),
      r.kind === 'embed'
        ? h(
            R.Fragment,
            null,
            h(
              'div',
              { className: 'dbt-video-frame' },
              h('iframe', {
                src: r.embedUrl,
                title: r.label + ' video',
                loading: 'lazy',
                referrerPolicy: 'strict-origin-when-cross-origin',
                sandbox: 'allow-scripts allow-same-origin allow-presentation',
                allow: 'accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen',
                allowFullScreen: true
              })
            ),
            h('p', { className: 'dbt-video-provenance' }, fill(COPY.videoPlays, { label: r.label }), h('a', Object.assign({ href: r.href }, link), COPY.videoOpen))
          )
        : null,
      r.kind === 'link' ? h('a', Object.assign({ href: r.href }, link), COPY.videoWatch + range + ' ↗') : null,
      // Nothing to point at: said plainly, never rendered as an empty space, and with NO href.
      r.kind === 'invalid' ? h('p', { className: 'dbt-video-missing' }, COPY.videoInvalid) : null
    );
  }

  function Figure(children, caption) {
    return h('figure', { className: 'dbt-figure' }, children, str(caption) ? h('figcaption', { className: 'dbt-figure-caption' }, str(caption)) : null);
  }

  function SvgDiagram(p) {
    var clean = R.useMemo(
      function () {
        return sanitiseSvg(p.svg);
      },
      [p.svg]
    );
    // sanitiseSvg is the controlled path — DOMPurify's SVG profile, the product's own options.
    return Figure(h('div', { className: 'dbt-figure-box', dangerouslySetInnerHTML: { __html: clean } }), p.caption);
  }

  function AnnotatedScreenshot(p) {
    var clean = R.useMemo(
      function () {
        return sanitiseSvg(p.overlaySvg);
      },
      [p.overlaySvg]
    );
    var src = str(p.src) || assetUrl(p, p.storageKey);
    var failed = R.useState(false);
    // A key the asset route cannot serve (no backend yet) is an honest placeholder
    // naming the key, never a broken-image icon the learner reads as their fault.
    if (failed[0]) {
      return Deferred('Screenshot: ' + str(p.storageKey), COPY.deferredImage, null, p.caption);
    }
    return Figure(
      h(
        'div',
        { className: 'dbt-shot' },
        h('img', {
          src: src,
          alt: str(p.caption) || 'Annotated screenshot',
          onError: function () {
            failed[1](true);
          }
        }),
        clean ? h('div', { className: 'dbt-shot-overlay', dangerouslySetInnerHTML: { __html: clean } }) : null
      ),
      p.caption
    );
  }

  function Deferred(title, note, children, caption) {
    return Figure(h('div', { className: 'dbt-deferred' }, h('p', { className: 'dbt-deferred-title' }, title), h('p', null, note), children), caption);
  }

  function Mermaid(p) {
    return Deferred('Diagram', COPY.deferredMermaid, h('pre', null, str(p.source)), p.caption);
  }

  function Chart(p) {
    var rows = data(p.data, []) || [];
    var yKeys = data(p.yKeys, []) || [];
    var cols = [str(p.xKey)].concat(yKeys.map(str));
    return Deferred(
      'Chart (' + str(p.chartType) + ')',
      COPY.deferredChart,
      h(
        'table',
        { className: 'dbt-table' },
        h(
          'thead',
          null,
          h(
            'tr',
            null,
            cols.map(function (c) {
              return h('th', { key: c }, c);
            })
          )
        ),
        h(
          'tbody',
          null,
          rows.map(function (row, i) {
            return h(
              'tr',
              { key: i },
              cols.map(function (c) {
                return h('td', { key: c }, str(row[c]));
              })
            );
          })
        )
      ),
      p.caption
    );
  }

  function Widget(p) {
    var params = data(p.params, {}) || {};
    return Deferred(COPY.deferredWidget + ': ' + str(p.widgetKey), COPY.deferredWidgetNote, h('pre', null, JSON.stringify(params, null, 2)), p.caption);
  }

  function HumanRecording(p) {
    var src = str(p.src) || assetUrl(p, p.storageKey);
    return h(
      'div',
      { className: 'dbt-recording' },
      h('span', { className: 'dbt-recording-chip' }, COPY.recordedForYou),
      str(p.contextualIntro) ? h('p', { className: 'dbt-recording-intro' }, str(p.contextualIntro)) : null,
      h('video', { controls: true, 'aria-label': COPY.recordedForYou, src: src })
    );
  }

  function Audio(p) {
    var source = data(p.source, {}) || {};
    var src = str(p.src) || (source.type === 'file' ? assetUrl(p, source.storageKey) : '');
    return h(
      'div',
      { className: 'dbt-audio' },
      src
        ? h('audio', { controls: true, preload: 'metadata', src: src })
        : h(
            'button',
            {
              type: 'button',
              className: 'dbt-btn',
              onClick: function () {
                emit(p, 'onListenText', str(source.text));
                emit(p, 'onListen');
              }
            },
            COPY.listen
          ),
      source.type === 'tts' && str(source.text)
        ? h('details', null, h('summary', null, COPY.transcript), h('p', { className: 'dbt-audio-transcript' }, str(source.text)))
        : null
    );
  }

  function VoiceInteraction(p) {
    var st = R.useState({ recording: false, text: '', sent: false });
    var s = st[0];
    var set = st[1];
    return h(
      'div',
      { className: 'dbt-voice' },
      h('p', { className: 'dbt-voice-prompt' }, str(p.prompt)),
      s.sent
        ? h(
            'div',
            null,
            h('p', { className: 'dbt-sent' }, COPY.quizSent),
            h(
              'button',
              {
                type: 'button',
                className: 'dbt-btn-quiet',
                onClick: function () {
                  set({ recording: false, text: '', sent: false });
                }
              },
              COPY.tryAgain
            )
          )
        : h(
            'div',
            null,
            h(
              'div',
              { className: 'dbt-voice-actions' },
              s.recording
                ? h(
                    R.Fragment,
                    null,
                    h('span', { className: 'dbt-voice-live' }, COPY.voiceRecording),
                    h(
                      'button',
                      {
                        type: 'button',
                        className: 'dbt-btn is-warm',
                        onClick: function () {
                          set(Object.assign({}, s, { recording: false }));
                          emit(p, 'onRecorded');
                        }
                      },
                      COPY.voiceStop
                    )
                  )
                : h(
                    R.Fragment,
                    null,
                    h(
                      'button',
                      {
                        type: 'button',
                        className: 'dbt-btn',
                        onClick: function () {
                          set(Object.assign({}, s, { recording: true }));
                          emit(p, 'onRecord');
                        }
                      },
                      COPY.voiceRecord
                    ),
                    h('span', { className: 'dbt-voice-or' }, COPY.voiceOr)
                  )
            ),
            h('textarea', {
              className: 'dbt-textarea',
              value: s.text,
              placeholder: COPY.voicePlaceholder,
              onChange: function (e) {
                set(Object.assign({}, s, { text: e.target.value }));
              }
            }),
            h(
              'button',
              {
                type: 'button',
                className: 'dbt-btn',
                disabled: !s.text.trim(),
                onClick: function () {
                  var t = s.text.trim();
                  if (!t) return;
                  set(Object.assign({}, s, { sent: true }));
                  emit(p, 'onAnswer', t);
                  emit(p, 'onAnswered');
                  emit(p, 'onAction');
                }
              },
              COPY.voiceSubmit
            )
          )
    );
  }

  // ── The palette: kind → renderer. EXHAUSTIVE over section.schema.ts; a kind with no entry throws by name. ──

  var RENDERERS = {
    reading: Reading,
    callout: Callout,
    answer_capsule: AnswerCapsule,
    code_block: CodeBlock,
    quiz: Quiz,
    activity: Activity,
    mermaid: Mermaid,
    svg_diagram: SvgDiagram,
    chart: Chart,
    interactive_widget: Widget,
    annotated_screenshot: AnnotatedScreenshot,
    curated_video: CuratedVideo,
    human_recording: HumanRecording,
    audio: Audio,
    voice_interaction: VoiceInteraction,
    capture: Capture,
    prep_pack: PrepPack,
    artifact_challenge: ArtifactChallenge,
    handover_pack: HandoverPack
  };

  // ── Port vocabularies ────────────────────────────────────────────────────────

  var G = 'Content';
  var E = 'Events';
  function port(type, name, extra) {
    return Object.assign({ type: type, displayName: name, group: G }, extra || {});
  }
  var text = function (name, extra) {
    return port('string', name, extra);
  };
  var obj = function (name, extra) {
    return port('object', name, Object.assign({ description: 'An object or array — wire a Static Data node, a Function, or paste JSON.' }, extra || {}));
  };
  var num = function (name, extra) {
    return port('number', name, extra);
  };
  var sig = function (name, description) {
    return { type: 'signal', displayName: name, group: E, description: description };
  };
  var out = function (type, name, description) {
    return { type: type, displayName: name, group: E, description: description };
  };

  var ASSET_BASE = text('Asset URL base', {
    default: '/api/assets/',
    description: 'Prepended to a storage key when no Src is given. A port, so the backend that serves files decides it.'
  });

  /** Outputs every ask can raise. The Section node forwards all of them. */
  var ACTION_OUTS = {
    onAction: sig('Acted', 'The learner did the thing this section asks — answered, ticked, saved, sent. Right or wrong (L60). What progress is measured over.'),
    onAnswered: sig('Answered', 'A quiz or voice answer was given. Answer and Correct already hold it.'),
    onAnswer: out('string', 'Answer', 'The answer as given — an option’s text, True/False, or the learner’s own words.'),
    onCorrect: out('boolean', 'Correct', 'Whether an mcq/true_false answer matched. NEVER put this on screen as a score.'),
    onSave: sig('Saved', 'A project fact was saved. Field and Value hold it — wire them to the backend.'),
    onSaveField: out('string', 'Field', 'The fact’s field name, e.g. deliverable.factName.'),
    onSaveValue: out('string', 'Value', 'What the learner wrote.'),
    onSubmit: sig('Submitted', 'An artifact was brought back. Content holds it.'),
    onSubmitContent: out('string', 'Content', 'The artifact, as pasted.'),
    onCopy: sig('Copied', 'The prep pack was copied. Pack holds the markdown.'),
    onPack: out('string', 'Pack', 'The assembled prep pack, as markdown.'),
    onWrite: sig('Write requested', 'The learner asked for the handover files. The graph calls the backend.'),
    onListen: sig('Listen requested', 'The learner asked to hear this section. Listen Text holds the words; the graph fetches audio and sets Src.'),
    onListenText: out('string', 'Listen Text', 'The text to speak.'),
    onRecord: sig('Record started', 'The learner pressed Record.'),
    onRecorded: sig('Record stopped', 'The learner pressed Stop.')
  };

  function pick(names) {
    var o = {};
    names.forEach(function (n) {
      o[n] = ACTION_OUTS[n];
    });
    return o;
  }

  // ── Node definitions ─────────────────────────────────────────────────────────

  /** A visual node whose root is the kind's own box, with the bridge's style applied. */
  function kindNode(id, displayName, docs, Renderer, inputProps, outputProps) {
    /** @type {import('./types/node-kit').ReactNodeDefinition} */
    var def = {
      name: KIT + '.' + id,
      displayNodeName: displayName,
      docs: docs,
      noodlNodeAsProp: true,
      getReactComponent: function () {
        return function Node(props) {
          var el = useRoot(props);
          return h('div', { ref: el, className: 'dbt-section dbt-section-' + id, style: props.style }, h(Renderer, props));
        };
      },
      inputProps: inputProps,
      outputProps: outputProps || {}
    };
    return def;
  }

  var Reading_ = kindNode(
    'Reading',
    'Lesson: Reading',
    'The gist of a section, in markdown, with optional depth behind “More detail”. Sanitised — a script in the markdown never reaches the page.',
    Reading,
    { markdown: text('Markdown', { description: 'The ~80-word gist. Markdown.' }), detail: text('Detail', { description: 'Opt-in depth. Empty = no control renders at all.' }) }
  );
  var Callout_ = kindNode(
    'Callout',
    'Lesson: Callout',
    'A jargon decoder, a tip, a watch-out or a reassurance. The tone is a class; the stylesheet decides the colour, and none of them is red.',
    Callout,
    { tone: port({ name: 'enum', enums: ['jargon', 'tip', 'warning', 'reassurance'] }, 'Tone', { default: 'tip' }), markdown: text('Markdown') }
  );
  var AnswerCapsule_ = kindNode('AnswerCapsule', 'Lesson: Answer capsule', 'The front-loaded short answer — the hero of a lesson.', AnswerCapsule, { text: text('Text') });
  var CodeBlock_ = kindNode('CodeBlock', 'Lesson: Code block', 'Code with its language badge and a sanitised markdown explanation.', CodeBlock, {
    language: text('Language', { default: 'text' }),
    code: text('Code'),
    explanation: text('Explanation', { description: 'Markdown.' })
  });
  var Quiz_ = kindNode(
    'Quiz',
    'Lesson: Quiz',
    'mcq, true_false, open_response or say_it_back. Choice answers are graded here from the section’s own answer key; written answers go out on the Answer port for the graph to have read. Wrong is warm, never red; Correct is a port, never a score.',
    Quiz,
    { question: text('Question'), variant: obj('Variant', { description: '{ type: "mcq", options: [{text, correct, feedback}] } | { type: "true_false", correct, feedback } | { type: "open_response" | "say_it_back", rubric }' }) },
    pick(['onAnswered', 'onAnswer', 'onCorrect', 'onAction'])
  );
  var Activity_ = kindNode(
    'Activity',
    'Lesson: Activity',
    'Numbered steps the learner ticks off, and optionally one project fact it captures. Ticking ONE step is the action.',
    Activity,
    { title: text('Title'), steps: obj('Steps', { description: 'An array of markdown strings.' }), capturesProjectFact: obj('Captures fact', { description: 'Optional: { field, prompt }.' }) },
    pick(['onSave', 'onSaveField', 'onSaveValue', 'onAction'])
  );
  var Capture_ = kindNode(
    'Capture',
    'Lesson: Capture',
    'Asks for one project fact and emits it. Pre-fills from Facts by field. The product bumps the project context on save; here the graph decides.',
    Capture,
    { prompt: text('Prompt', { description: 'Markdown.' }), field: text('Field', { description: 'lowerCamelCase, or deliverable.factName.' }), hint: text('Hint'), initialValue: text('Initial value'), facts: obj('Facts', { description: 'The learner’s facts, { field: value }.' }) },
    pick(['onSave', 'onSaveField', 'onSaveValue', 'onAction'])
  );
  var PrepPack_ = kindNode(
    'PrepPack',
    'Lesson: Prep pack',
    'The end-of-lesson hand-off document assembled from captured facts, with Copy and Download.',
    PrepPack,
    { title: text('Title'), instructions: text('Instructions', { description: 'Markdown.' }), factFields: obj('Fact fields', { description: 'An array of field names.' }), facts: obj('Facts') },
    pick(['onCopy', 'onPack', 'onAction'])
  );
  var ArtifactChallenge_ = kindNode(
    'ArtifactChallenge',
    'Lesson: Artifact challenge',
    'The produce beat: a brief, 3–5 named criteria and a composer. Emits the artifact; the reading against each criterion is the graph’s to fetch. No number, ever.',
    ArtifactChallenge,
    { title: text('Title'), brief: text('Brief', { description: 'Markdown.' }), rubric: obj('Rubric', { description: 'An array of 3–5 named criteria.' }), acceptedFormats: obj('Accepted formats', { description: '["text","markdown"]' }) },
    pick(['onSubmit', 'onSubmitContent', 'onAction'])
  );
  var HandoverPack_ = kindNode(
    'HandoverPack',
    'Lesson: Handover pack',
    'The files the learner carries across to their own machine — names and purposes. Writing them needs the backend; the button emits Write requested.',
    HandoverPack,
    { title: text('Title'), intro: text('Intro', { description: 'Markdown.' }), files: obj('Files', { description: 'An array of { path, purpose }.' }), productName: text('Product name', { default: 'Digital Bricks Training' }) },
    pick(['onWrite', 'onAction'])
  );
  var CuratedVideo_ = kindNode(
    'CuratedVideo',
    'Lesson: Curated video',
    'A YouTube, Vimeo or Loom clip with in/out times, framed sandboxed from a privacy-respecting host. Any other http(s) URL is a link; anything else gets no link at all.',
    CuratedVideo,
    { url: text('URL'), startSeconds: num('Start (s)', { default: 0 }), endSeconds: num('End (s)', { default: 0 }), whyItMatters: text('Why it matters') }
  );
  var SvgDiagram_ = kindNode('SvgDiagram', 'Lesson: SVG diagram', 'Inline SVG through the SVG sanitiser (DOMPurify’s SVG profile): no script, no event handler, no foreign object.', SvgDiagram, {
    svg: text('SVG'),
    caption: text('Caption')
  });
  var Mermaid_ = kindNode('Mermaid', 'Lesson: Mermaid (source)', 'PLACEHOLDER: shows the diagram source and caption. Rendering needs the Mermaid library, not bundled yet (README).', Mermaid, {
    source: text('Source'),
    caption: text('Caption')
  });
  var Chart_ = kindNode('Chart', 'Lesson: Chart (data)', 'PLACEHOLDER: shows the data as a table. Drawing it needs a chart library, not bundled yet (README).', Chart, {
    chartType: port({ name: 'enum', enums: ['bar', 'line', 'pie', 'scatter'] }, 'Chart type', { default: 'bar' }),
    data: obj('Data'),
    xKey: text('X key'),
    yKeys: obj('Y keys'),
    caption: text('Caption')
  });
  var Widget_ = kindNode('Widget', 'Lesson: Interactive widget (key)', 'PLACEHOLDER: names the widget and shows its params. The five widgets are separate components not yet in this kit (README).', Widget, {
    widgetKey: text('Widget key'),
    params: obj('Params'),
    caption: text('Caption')
  });
  var AnnotatedScreenshot_ = kindNode('AnnotatedScreenshot', 'Lesson: Annotated screenshot', 'An image with a sanitised SVG overlay drawn over it.', AnnotatedScreenshot, {
    storageKey: text('Storage key'),
    src: text('Src', { description: 'The image URL. Empty = Asset URL base + storage key.' }),
    overlaySvg: text('Overlay SVG'),
    caption: text('Caption'),
    assetBase: ASSET_BASE
  });
  var HumanRecording_ = kindNode('HumanRecording', 'Lesson: Human recording', 'A person’s recording, in the warm surround reserved for a human voice.', HumanRecording, {
    storageKey: text('Storage key'),
    src: text('Src', { description: 'The video URL. Empty = Asset URL base + storage key.' }),
    contextualIntro: text('Intro'),
    assetBase: ASSET_BASE
  });
  var Audio_ = kindNode(
    'Audio',
    'Lesson: Audio',
    'A file plays; a TTS source shows a Listen button that emits the text for the graph to voice, and the transcript.',
    Audio,
    { source: obj('Source', { description: '{ type: "file", storageKey } | { type: "tts", text, lang }' }), src: text('Src', { description: 'An audio URL — set it and the player renders.' }), assetBase: ASSET_BASE },
    pick(['onListen', 'onListenText'])
  );
  var VoiceInteraction_ = kindNode(
    'VoiceInteraction',
    'Lesson: Voice interaction',
    'A spoken-or-typed answer. Record/Stop emit signals for the graph; the typed answer goes out on Answer.',
    VoiceInteraction,
    { prompt: text('Prompt'), lang: text('Language', { default: 'en' }), rubric: text('Rubric') },
    pick(['onRecord', 'onRecorded', 'onAnswered', 'onAnswer', 'onAction'])
  );

  /**
   * THE DISPATCHER. One section object in, the right renderer out, wrapped in
   * the knot the lesson thread draws (`.lesson-section`, with `knot-warm` for a
   * human recording and `knot-tied` / `knot-current` from two boolean ports).
   * Every output above is forwarded, so a `For Each` over `sections` wires once.
   */
  /** @type {import('./types/node-kit').ReactNodeDefinition} */
  var Section = {
    name: KIT + '.Section',
    displayNodeName: 'Lesson: Section',
    docs:
      'Renders ANY section of the closed palette by its kind — the node a For Each over a lesson’s sections places. Draws the knot on the thread. A kind with no renderer throws by name rather than rendering nothing.',
    noodlNodeAsProp: true,
    usePortAsLabel: 'label',
    getReactComponent: function () {
      return function SectionNode(props) {
        var el = useRoot(props);
        var section = data(props.section, null);
        if (!section || typeof section !== 'object') {
          return h('div', { ref: el, className: 'lesson-section', style: props.style });
        }
        var Renderer = RENDERERS[section.kind];
        if (!Renderer) throw new Error('dbt-lesson.Section: no renderer for section kind "' + String(section.kind) + '"');
        var cls = ['lesson-section', 'dbt-section-' + section.kind, section.kind === 'human_recording' && 'knot-warm', props.done && 'knot-tied', props.current && !props.done && 'knot-current']
          .filter(Boolean)
          .join(' ');
        var forwarded = { facts: props.facts, assetBase: props.assetBase };
        Object.keys(ACTION_OUTS).forEach(function (k) {
          forwarded[k] = props[k];
        });
        return h('div', { ref: el, className: cls, style: props.style, 'data-section-id': str(section.id) }, h(Renderer, Object.assign({}, section, forwarded)));
      };
    },
    inputProps: {
      section: obj('Section', { description: 'One section object: { id, kind, ...the kind’s fields }.' }),
      facts: obj('Facts', { description: 'The learner’s captured facts, { field: value }, for capture and prep_pack.' }),
      done: port('boolean', 'Done', { default: false, description: 'Draws the tied (teal) knot. Decoration only — nothing gates.' }),
      current: port('boolean', 'Current', { default: false, description: 'Draws the current-knot ring.' }),
      label: text('Label', { description: 'Shown on the node in the graph only.' }),
      assetBase: ASSET_BASE
    },
    outputProps: ACTION_OUTS
  };


  // ── THE PROGRAMME'S ROWS (TASK-L158, sprint 45) ─────────────────────────────
  //
  // One entry of a learner's programme, drawn the way the product draws it.
  // Sources, in the product's repo:
  //   TimelineRow, stateClass, renderEntry -> src/lib/components/course/PathList.tsx
  //   KindGlyph, DoneTick                  -> src/lib/components/course/TimelineKind.tsx
  //   VOICE                                -> src/lib/components/course/timeline-voice.ts
  //
  // WHY A KIT NODE AND NOT A GRAPH. Measured 2026-09-20: the catalogue has 180
  // node types, no SVG node, no chart node and no `<details>`. The glyphs are
  // six distinct geometries; the fold's guarantee is that a closed row's
  // children are NOT MOUNTED, which is a rendering fact rather than a layout
  // parameter. Ordering, grouping, folding and the preview's words stay in
  // `Logic/Ordered timeline` — readable, changeable graph, which is the whole
  // argument for building this in NodeGX at all.

  /** The timeline's words, from `src/i18n/en/course.json` — one place, so a string table replaces them in one edit. */
  var TL_COPY = {
    fold: 'Fold this back up',
    ask: 'Ask your coach about this',
    comments_one: '{n} comment',
    comments_other: '{n} comments',
    notes_one: '{n} note',
    notes_other: '{n} notes',
    noteKind: 'Note about this step',
    noteFrom: 'From {who}',
    status: { complete: 'Completed', in_progress: 'In progress', available: 'Ready to start', locked: 'Locked' },
    sessionCancelled: 'Cancelled',
    sessionPrep: 'Before this session',
    sessionMinutes: '{n} minutes',
    assignmentDue: 'For',
    assignmentNoDate: 'No date on this one — when you get to it',
    assignmentSent: 'you’ve sent something in',
    assignmentWithdrawn: 'your coach has taken this one back',
    assignmentCriteria: 'What it asks for',
    evaluationDue: 'Due',
    evaluationNoDate: 'Your coach will set a date for this one',
    evaluationNotYet: 'Your coach hasn’t written this one up yet',
    evaluationCriteria: 'What we looked at',
    evaluationNextStep: 'What would move it',
    submissionEvaluated: 'read and commented on',
    submissionNotYet: 'not assessed yet'
  };

  function plural(one, other, n) {
    return fill(n === 1 ? one : other, { n: n });
  }

  // ── The glyphs ──────────────────────────────────────────────────────────────
  //
  // Inline `currentColor` SVG, never emoji: an emoji renders in the reader's own
  // font at the reader's own colour, and a knot's fill already carries state.
  // Deliberately simple marks rather than pictograms — at 10px a picture is a
  // smudge, and what the reader needs is *these two rows are different things*,
  // with the words on the row saying which.

  var GLYPH_STROKE = { stroke: 'currentColor', strokeWidth: 2.2, fill: 'none', strokeLinecap: 'round', strokeLinejoin: 'round' };
  function gp(d) {
    return h('path', Object.assign({ d: d }, GLYPH_STROKE));
  }
  function gc(cx, cy, r) {
    return h('circle', Object.assign({ cx: cx, cy: cy, r: r }, GLYPH_STROKE));
  }

  /**
   * TOTAL over the entry kinds. A kind with no entry here throws BY NAME rather
   * than drawing nothing — L126 found `PathList`'s own "a missing case fails the
   * build" claim had been false for nine sprints, because its switch returned
   * `React.ReactNode` and `undefined` is assignable to that. `null` is a
   * DECISION (this kind draws no glyph), not an omission.
   */
  var GLYPH = {
    // A session: two people, as two marks side by side.
    session: function () {
      return h('g', null, gc(5.5, 6, 2.4), gc(11, 6, 2.4), gp('M2 13c0-2 1.6-3.2 3.5-3.2S9 11 9 13'));
    },
    // A note: a written line.
    note: function () {
      return h('g', null, gp('M4 4h8M4 8h8M4 12h5'));
    },
    // A review: a mark against a scale.
    evaluation: function () {
      return h('g', null, gp('M3 13V3M3 13h10'), gp('M6 10l2.5-3L11 5.5'));
    },
    // A lesson: an open book.
    lesson: function () {
      return h(
        'g',
        null,
        gp('M8 4.5v8'),
        gp('M8 4.5C6.6 3.4 4.8 3.2 3 3.6v7.6c1.8-.4 3.6-.2 5 .9'),
        gp('M8 4.5c1.4-1.1 3.2-1.3 5-.9v7.6c-1.8-.4-3.6-.2-5 .9')
      );
    },
    // A brief: a sheet with a turned corner.
    assignment: function () {
      return h('g', null, gp('M4 2.5h5L12 6v7.5H4z'), gp('M9 2.5V6h3'));
    },
    // Work sent in: an arrow leaving.
    submission: function () {
      return h('g', null, gp('M8 12.5V3.5'), gp('M4.5 7L8 3.5 11.5 7'));
    },
    // Neither reaches a learner's programme: `message` belongs to the
    // conversation (L118) and `projectForLearner` drops every `signal` before a
    // learner's payload exists. Listed so the map stays TOTAL rather than short.
    message: null,
    signal: null
  };

  /** Sprint 8's check, unchanged — a completed lesson keeps its tick rather than taking the book. */
  function DoneTick() {
    return h('path', {
      d: 'M3.5 8.5l3 3 6-7',
      stroke: 'currentColor',
      strokeWidth: 2.4,
      fill: 'none',
      strokeLinecap: 'round',
      strokeLinejoin: 'round'
    });
  }

  function Knot(p) {
    var kind = str(p.kind);
    if (!Object.prototype.hasOwnProperty.call(GLYPH, kind)) {
      throw new Error('dbt-lesson.TimelineRow: no glyph rule for entry kind "' + kind + '"');
    }
    var draw = GLYPH[kind];
    var mark = p.done && kind === 'lesson' ? h(DoneTick) : draw ? draw() : null;
    return h(
      'div',
      { className: 'path-knot', 'aria-hidden': 'true' },
      mark
        ? h('svg', { viewBox: '0 0 16 16', width: p.done && kind === 'lesson' ? 10 : 9, height: p.done && kind === 'lesson' ? 10 : 9, className: 'path-knot-glyph' }, mark)
        : null
    );
  }

  // ── Whose entry is this ─────────────────────────────────────────────────────
  //
  // TWO VOICES, NOT SEVEN COLOURS (L130 §2). Three kinds are the coach speaking,
  // three are the learner's own work; that is a difference a reader can USE and
  // it survives a kind being added. Seven categorical hues on a page of prose
  // would fight the one-accent language, and `--series-*` are for marks in a
  // plot, where a legend and a shape carry identity alongside the colour.
  var VOICE = {
    session: 'coach',
    note: 'coach',
    evaluation: 'coach',
    lesson: 'learner',
    assignment: 'learner',
    submission: 'learner',
    message: 'none',
    signal: 'none'
  };

  /** Knot and card by STATE, not by kind — what a learner wants at a glance is what is done, in play and coming. */
  function stateClass(entry) {
    if (entry.kind === 'lesson') {
      return 'path-step ' + ({ complete: 'complete', in_progress: 'active', available: 'available', locked: 'locked' }[entry.status] || 'available');
    }
    return 'path-step ' + ({ done: 'complete', now: 'active', ahead: 'available' }[entry.state] || 'available');
  }

  // ── The card ────────────────────────────────────────────────────────────────

  function list(className, items) {
    var rows = (items || []).filter(function (x) {
      return str(x).trim();
    });
    if (!rows.length) return null;
    return h(
      'ul',
      { className: className },
      rows.map(function (x, i) {
        return h('li', { key: i }, str(x));
      })
    );
  }

  function meta(text) {
    return text ? h('p', { className: 'path-card-note' }, text) : null;
  }

  /**
   * TOTAL over the entry kinds, same rule as `GLYPH`: an unhandled kind throws
   * by name rather than rendering an empty card. `message` returns null and the
   * row never mounts at all — the one kind this surface has never drawn.
   */
  var CARD = {
    lesson: function (e) {
      return [
        e.rationale ? md(e.rationale, 'path-step-why') : null,
        h('p', { className: 'path-card-note' }, TL_COPY.status[str(e.status)] || '')
      ];
    },
    session: function (e) {
      var s = e.session || {};
      var prep = (s.prep || []).map(function (x) {
        return x && x.title;
      });
      return [
        s.cancelledAt ? meta(TL_COPY.sessionCancelled) : null,
        s.durationMinutes ? meta(fill(TL_COPY.sessionMinutes, { n: s.durationMinutes })) : null,
        s.summary ? md(s.summary, 'path-card-body') : null,
        prep.length ? h('p', { className: 'path-card-label' }, TL_COPY.sessionPrep) : null,
        list('path-card-list', prep)
      ];
    },
    note: function (e) {
      var n = e.note || {};
      return [n.authorName ? meta(fill(TL_COPY.noteFrom, { who: n.authorName })) : null, md(n.body, 'path-card-body')];
    },
    evaluation: function (e) {
      return [
        e.completedAt ? null : meta(e.dueOn ? TL_COPY.evaluationNotYet : TL_COPY.evaluationNoDate),
        e.summary ? md(e.summary, 'path-card-body') : null,
        e.criteria && e.criteria.length ? h('p', { className: 'path-card-label' }, TL_COPY.evaluationCriteria) : null,
        list('path-card-list', e.criteria),
        e.nextStep ? h('p', { className: 'path-card-label' }, TL_COPY.evaluationNextStep) : null,
        e.nextStep ? md(e.nextStep, 'path-card-body') : null
      ];
    },
    assignment: function (e) {
      return [
        e.withdrawn ? meta(TL_COPY.assignmentWithdrawn) : e.answered ? meta(TL_COPY.assignmentSent) : null,
        md(e.brief, 'path-card-body'),
        e.criteria && e.criteria.length ? h('p', { className: 'path-card-label' }, TL_COPY.assignmentCriteria) : null,
        list('path-card-list', e.criteria)
      ];
    },
    submission: function (e) {
      return [meta(e.evaluated ? TL_COPY.submissionEvaluated : TL_COPY.submissionNotYet)];
    },
    message: null,
    signal: null
  };

  /** A coach's note, drawn the same way whether it is its own row or carried under the card it points at. */
  function NoteBody(props) {
    var n = props.note || {};
    return h(
      'div',
      { className: 'path-carried-note' },
      h('p', { className: 'path-card-label' }, TL_COPY.noteKind),
      n.authorName ? meta(fill(TL_COPY.noteFrom, { who: n.authorName })) : null,
      md(n.body, 'path-card-body')
    );
  }

  function TimelineRowView(p) {
    var entry = data(p.entry, null);
    var notes = data(p.notes, []) || [];
    var comments = Number(p.comments) || 0;

    /*
     * ── COLLAPSE IS DERIVED FIRST AND HELD IN COMPONENT STATE (L130 §3) ──────
     * The default comes from the graph's `startsCollapsed`; the state is what
     * the reader has done since. It is NOT persisted: a learner's page would
     * revert to the wall it replaced, one expansion at a time.
     */
    /*
     * ── AND IT IS KEYED ON THE ROW'S IDENTITY, WHICH ONLY A RENDER SAID ─────
     * `useState(!p.collapsed)` reads the port ONCE, at mount — and a node
     * mounts before the graph has set its inputs. Measured on the first drive:
     * `folded: 0, open: 20` on a programme whose model folds eleven of them.
     * The initial value was `!undefined`, every row opened, and nothing
     * errored — the fold silently did not exist.
     *
     * So the state carries the KEY it was derived from and re-derives when that
     * key changes. The reader's clicks own the row from then until its identity
     * or the programme's own answer changes.
     */
    var st = R.useState({ key: null, open: true });
    var s = st[0];
    var set = st[1];
    var key = str(p.entry && p.entry.id ? p.entry.id : (entry && entry.id)) + '|' + String(!!p.collapsed);
    var open = s.key === key ? s.open : !p.collapsed;
    R.useEffect(
      function () {
        if (s.key !== key) set({ key: key, open: !p.collapsed });
      },
      [key]
    );
    function setOpen(next) {
      set({ key: key, open: next });
    }

    if (!entry || typeof entry !== 'object') return null;

    var kind = str(entry.kind);
    if (!Object.prototype.hasOwnProperty.call(CARD, kind)) {
      throw new Error('dbt-lesson.TimelineRow: no card rule for entry kind "' + kind + '"');
    }
    // The one kind this surface has never drawn. Nothing mounts, so the zero is
    // a row that does not exist rather than a row that is empty.
    if (CARD[kind] === null) return null;

    var isDone = kind === 'lesson' ? entry.status === 'complete' : entry.state === 'done';
    var startsFolded = isDone;

    function toggle(next) {
      setOpen(next);
      if (next) emit(p, 'onOpened');
      emit(p, 'onToggled');
    }

    /*
     * WHAT THIS CARD CARRIES, SAID ON THE FOLDED LINE (L138 §1). A note is
     * normally written about something that has already HAPPENED, so it lands
     * on a row that arrives folded and the fold hides it with nothing saying it
     * is there.
     *
     * WORDS AND A NUMBER, never a badge, a dot or a colour. THE COUNT IS
     * `notes.length` AND NEVER A SEPARATE NUMBER, so the folded line cannot
     * promise a note the open card does not hold.
     */
    var carries = [];
    if (notes.length) carries.push(plural(TL_COPY.notes_one, TL_COPY.notes_other, notes.length));
    if (comments) carries.push(plural(TL_COPY.comments_one, TL_COPY.comments_other, comments));

    var cls = [stateClass(entry), 'timeline-' + kind, 'timeline-voice-' + (VOICE[kind] || 'none'), open ? 'is-open' : 'is-folded'].join(' ');

    var body = open
      ? h.apply(
          null,
          [
            'div',
            /*
             * `path-card-block` on EVERY kind, including a lesson. `.path-card`
             * alone is a flex ROW, which is right in the product because a
             * lesson's card puts a call to action on the right — and this
             * template has one lesson fixture, so a per-row CTA would promise
             * twenty different lessons it does not have (recorded in L158's
             * status). Block is the honest layout for what is actually drawn.
             */
            { className: 'path-card path-card-block' },
            h('p', { className: 'path-step-label' }, str(p.kindLabel)),
            h('h3', { className: 'path-step-title' }, str(p.title))
          ].concat(CARD[kind](entry))
        )
      : /*
         * ONE LINE THE READER CAN OPEN. Not hidden, not filtered, nothing
         * disappears. A button rather than a link: it changes what is on screen,
         * it does not navigate.
         */
        h(
          'button',
          {
            type: 'button',
            className: 'path-folded',
            'aria-expanded': false,
            onClick: function () {
              toggle(true);
            }
          },
          h('span', { className: 'path-folded-kind' }, str(p.kindLabel)),
          h('span', { className: 'path-folded-title' }, str(p.title)),
          str(p.when) ? h('span', { className: 'path-folded-when' }, str(p.when)) : null,
          // NOTHING AT ALL when there is neither, so a row carrying nothing
          // reads exactly as a row that carries nothing.
          carries.length ? h('span', { className: 'path-folded-carries' }, carries.join(' · ')) : null
        );

    return h(
      'div',
      { className: cls },
      h(Knot, { kind: kind, done: isDone }),
      body,
      // The coach's notes about THIS card, under it, on an open card only.
      open
        ? notes.map(function (n, i) {
            return h(NoteBody, { key: (n && n.id) || i, note: n });
          })
        : null,
      /*
       * ASK YOUR COACH ABOUT THIS (L131 §3), on an OPEN card only — a folded row
       * is one line the reader can open, and hanging a second control off it
       * would make it two. It EMITS; nothing here writes (sprint 45 decision 6).
       */
      open
        ? h(
            'button',
            {
              type: 'button',
              className: 'path-ask',
              onClick: function () {
                emit(p, 'onAnchorKind', kind);
                emit(p, 'onAnchorId', str(entry.id));
                emit(p, 'onAskRequested');
              }
            },
            TL_COPY.ask
          )
        : null,
      /*
       * Re-folding is reversible, and only offered on rows that STARTED folded:
       * `now` and `ahead` are never collapsible, so there is no control on them
       * to press by accident.
       */
      open && startsFolded
        ? h(
            'button',
            {
              type: 'button',
              className: 'path-fold-again',
              'aria-expanded': true,
              onClick: function () {
                toggle(false);
              }
            },
            TL_COPY.fold
          )
        : null
    );
  }

  /** @type {import('./types/node-kit').ReactNodeDefinition} */
  var TimelineRow = {
    name: KIT + '.TimelineRow',
    displayNodeName: 'Course: Timeline row',
    docs:
      'One entry of a learner’s programme. Folded to a single line when it is behind them, open when it is in play or ahead — and a FOLDED ROW MOUNTS NOTHING, so a closed row’s card does not exist rather than being invisible. The glyph says what kind of thing it is, the wash says whose entry it is. Ordering, grouping and the preview’s words belong to the graph; a kind with no glyph or card rule throws by name.',
    noodlNodeAsProp: true,
    usePortAsLabel: 'title',
    getReactComponent: function () {
      return function TimelineRowNode(props) {
        var el = useRoot(props);
        return h(
          'div',
          {
            ref: el,
            className: 'dbt-timeline-row',
            style: props.style,
            // What the GRAPH said, beside what the row DID — so a fold that
            // disagrees with the programme is attributable rather than a guess.
            'data-collapsed': String(!!props.collapsed)
          },
          h(TimelineRowView, props)
        );
      };
    },
    inputProps: {
      entry: obj('Entry', { description: 'One timeline entry: { id, kind, state, at, … the kind’s own fields }.' }),
      kindLabel: text('Kind label', { description: 'What kind of thing this is, in words. The graph owns the wording.' }),
      title: text('Title', { description: 'What identifies THIS row — the preview title the graph already resolved.' }),
      when: text('When', { description: 'The date, already formatted. Formatting it here would read the ambient timezone (L93/L100).' }),
      collapsed: port('boolean', 'Starts folded', { default: false, description: 'Derived from the programme by the graph, never stored. What the reader does after is this node’s own state.' }),
      notes: obj('Notes', { description: 'The coach’s notes anchored to this entry. Its LENGTH is the count on the folded line — never a separate number.' }),
      comments: num('Comments', { default: 0, description: 'How many comments this entry’s thread holds. Words and a number on the folded line, never a badge.' }),
      assetBase: ASSET_BASE
    },
    outputProps: {
      onToggled: sig('Toggled', 'The reader opened or re-folded this row.'),
      onOpened: sig('Opened', 'The reader opened this row. Fires on open only.'),
      onAskRequested: sig('Ask requested', 'The learner asked their coach about this entry. Anchor kind and Anchor id already hold what it is about.'),
      onAnchorKind: out('string', 'Anchor kind', 'The entry’s kind — what the question is about.'),
      onAnchorId: out('string', 'Anchor id', 'The entry’s id — what the question is about.')
    }
  };


  // ── WHERE YOU'RE AT (TASK-L159, sprint 45) ──────────────────────────────────
  //
  // Two panels above the programme. Sources, in the product's repo:
  //   PaceTracker            -> src/lib/components/course/PaceTracker.tsx
  //   RatingGauge            -> src/lib/components/course/RatingGauge.tsx
  //   the maths behind both  -> server/timeline/{standing,pace,trajectory}.ts
  //                             and format/rating.ts, all of it ported into
  //                             `Logic/Standing` rather than into this file.
  //
  // THESE NODES COMPUTE NOTHING. Every number arrives as a fraction the graph
  // has already worked out — `parPoints` included, which `pace.ts` exports for
  // exactly that reason. What is left here is the drawing box: mapping a
  // fraction onto a 100×40 viewBox and a percentage onto a track. A renderer
  // that rebuilt the par rule, or the 1–10 scale, would be a second owner of it.
  //
  // WHY KIT NODES AND NOT A GRAPH. Measured 2026-09-20: 180 node types, no SVG
  // node and no chart node. Two polylines and a dashed par line cannot be
  // expressed as Groups, and a gauge's four marks are absolutely positioned
  // against one track.

  /** The pace tracker's drawing box. Stroke widths are held honest by `vector-effect`. */
  var PACE_W = 100;
  var PACE_H = 40;
  var PACE_PAD = 3;

  function PaceTrackerView(p) {
    var view = data(p.view, null);
    var par = data(p.par, []) || [];
    if (!view || typeof view !== 'object' || !view.target) return null;

    /*
     * COLOUR ONLY EVER CELEBRATES. Ahead of par may wear `--go`, which is the
     * token for done and is what being ahead IS. Short of pace is the same ink
     * as the rest of the product: no red — this product has never had one — and
     * no `--warm`, which is encouragement and human recording and would make
     * "you are short of pace" read as an encouragement sticker. The par line
     * never changes colour with how somebody is doing.
     */
    var ahead = Number(view.delta) > 0;

    var y = function (done) {
      return PACE_PAD + (1 - done / view.target) * (PACE_H - 2 * PACE_PAD);
    };
    var x = function (fraction) {
      return Number(fraction) * PACE_W;
    };
    var path = function (points) {
      return (points || [])
        .map(function (q) {
          return x(q.x).toFixed(2) + ',' + y(Number(q.done)).toFixed(2);
        })
        .join(' ');
    };
    var horizonX = x(view.horizonX);
    var headline = str(p.headline);

    return h(
      'div',
      { className: 'pace' },
      h('p', { className: 'pace-headline' }, headline),
      h(
        'div',
        { className: 'pace-chart' },
        h(
          'svg',
          {
            viewBox: '0 0 ' + PACE_W + ' ' + PACE_H,
            preserveAspectRatio: 'none',
            role: 'img',
            /*
             * NO HOVER OR TOOLTIP LAYER, which a line chart otherwise gets by
             * default. The one thing a crosshair would say — how far ahead or
             * short of pace this person is — is written in words directly above,
             * and this is that same sentence. "Super simple" was the constraint.
             */
            'aria-label': headline,
            className: 'pace-svg'
          },
          // The horizon: one marker, and the only rule on the plot.
          h('line', { x1: horizonX, y1: 0, x2: horizonX, y2: PACE_H, className: 'pace-horizon', vectorEffect: 'non-scaling-stroke' }),
          // Par — a recessive dashed hairline in text ink. It runs to the edge
          // because it is an AGREEMENT rather than an observation.
          h('polyline', { points: path(par), fill: 'none', className: 'pace-par', vectorEffect: 'non-scaling-stroke' }),
          // Theirs. Its last vertex is `now`, never the right-hand edge: it
          // never asserts a future nobody has reached.
          h('polyline', {
            points: path(view.actual),
            fill: 'none',
            className: ahead ? 'pace-actual is-ahead' : 'pace-actual',
            vectorEffect: 'non-scaling-stroke'
          })
        )
      ),
      // Two series, so a legend — a coloured marker beside INK text, never text
      // wearing the series colour (the dataviz rule).
      h(
        'ul',
        { className: 'pace-legend' },
        h(
          'li',
          { className: 'pace-legend-item' },
          h('span', { className: ahead ? 'pace-swatch is-actual is-ahead' : 'pace-swatch is-actual', 'aria-hidden': 'true' }),
          h('span', null, str(p.legendActual))
        ),
        h(
          'li',
          { className: 'pace-legend-item' },
          h('span', { className: 'pace-swatch is-par', 'aria-hidden': 'true' }),
          h('span', null, str(p.legendPar))
        )
      )
    );
  }

  /** @type {import('./types/node-kit').ReactNodeDefinition} */
  var PaceTracker = {
    name: KIT + '.PaceTracker',
    displayNodeName: 'Course: Pace tracker',
    docs:
      'The learner’s own line against the pace their own programme needs — two lines and a horizon marker, nothing else. It DRAWS a view and computes none of it: wire Pace view and Par points from Logic/Standing. It renders nothing at all without a view, which is the state of every learner with no agreed end and nothing booked — a pace line against a schedule nobody agreed to is a deadline the product invented. Ahead may wear --go; short of pace is the same ink, never red and never --warm.',
    noodlNodeAsProp: true,
    getReactComponent: function () {
      return function PaceTrackerNode(props) {
        var el = useRoot(props);
        return h('div', { ref: el, className: 'dbt-pace', style: props.style }, h(PaceTrackerView, props));
      };
    },
    inputProps: {
      view: obj('Pace view', { description: '`paceView`’s output: { target, done, par, delta, horizonX, nowX, actual[] }. Absent or targetless renders nothing.' }),
      par: obj('Par points', { description: '`parPoints(view)` — the par line’s own vertices. The graph owns the par rule; rebuilding it here would be a second owner of it.' }),
      headline: text('Headline', { description: 'The gap in words, already composed. It is also the chart’s accessible name.' }),
      legendActual: text('Legend: theirs'),
      legendPar: text('Legend: par')
    },
    outputProps: {}
  };

  function RatingGaugeView(p) {
    var g = data(p.gauge, null);
    if (!g || typeof g !== 'object') return null;

    var pct = function (n) {
      return (Number(n) * 100).toFixed(2) + '%';
    };

    var fillStyle = { width: pct(g.hasScore ? g.scoreFraction : 0) };
    /*
     * THE ONE PLACE THE RAMP IS EXPRESSED, and it is tokens inside an inline
     * value rather than a colour literal — which is what invariant 9 permits
     * and a hex is not. It runs from the ordinary series ink to `--go` as the
     * score approaches the flag, so it ONLY EVER IMPROVES and the low end is
     * never an alarm. `approach` is clamped at 1 upstream, so nothing gets
     * greener past the agreement. A literal `--warm`→`--go` ramp is one
     * color-mix away if that departure is ever overruled.
     */
    if (g.hasTarget && !g.atTarget) {
      fillStyle.background = 'color-mix(in srgb, var(--go) ' + Math.round(Number(g.approach) * 100) + '%, var(--series-1))';
    }

    var cls = ['rating-gauge', g.variant === 'confidence' ? 'is-confidence' : '', g.atTarget ? 'is-at-target' : '']
      .filter(Boolean)
      .join(' ');

    var marks = [];
    if (g.scale) {
      marks.push(h('span', { key: 'low', className: 'rating-gauge-end is-low', 'aria-hidden': 'true' }, String(g.scaleMin)));
    }
    if (g.hasScore) {
      marks.push(h('span', { key: 'fill', className: 'rating-gauge-fill', style: fillStyle }));
    }
    /*
     * WHERE THEY HAVE BEEN, on the same track as where they are — so movement
     * and position are read at one scale. BEHIND the live mark in the DOM so
     * the live one wins any overlap: two judgements at the same score are the
     * ordinary case and the reader must never be unsure which is current.
     *
     * NOT CONTROLS HERE, and that is deliberate rather than an omission. In the
     * product a mark leads back to the entry the judgement was made at; this
     * template has no pointer and nothing to lead to, and a mark that goes
     * nowhere reads exactly like a broken product. Absent means a picture, so
     * `role="img"` is correct and the accessible name is read.
     */
    (g.earlier || []).forEach(function (e, i) {
      marks.push(
        h('span', {
          key: 'ghost-' + i,
          className: 'rating-gauge-ghost',
          style: { left: pct(e.fraction) },
          title: str(e.title) || undefined,
          'aria-label': str(e.ariaLabel) || undefined
        })
      );
    });
    // Where they are. It carries the number; the scale is said at the ends of
    // the track, because "6/10" on top of a gauge is the arithmetic back.
    if (g.hasScore) {
      marks.push(
        h(
          'span',
          { key: 'mark', className: 'rating-gauge-mark', style: { left: pct(g.scoreFraction) } },
          h('span', { className: 'rating-gauge-score' }, String(g.score))
        )
      );
    }
    // What they agreed. A LINE, never a second dot: two dots on one track is
    // identity by position alone.
    if (g.hasTarget) {
      marks.push(
        h(
          'span',
          { key: 'flag', className: 'rating-gauge-flag', style: { left: pct(g.targetFraction) } },
          h('span', { className: 'rating-gauge-goal' }, str(g.goalLabel) + ' ' + String(g.target))
        )
      );
    }
    /*
     * THE HIGH END GIVES WAY TO THE FLAG, and the graph decided that: a target
     * at the top of the scale puts "GOAL 10" exactly where "10" is written, and
     * two numbers in one place is worse than one number missing. The flag wins
     * because it is the fact the reader came for — and it names the top of the
     * scale anyway when it is standing there. The low end is unaffected:
     * nothing is ever agreed at 1.
     */
    if (g.scale && g.showHighEnd) {
      marks.push(h('span', { key: 'high', className: 'rating-gauge-end is-high', 'aria-hidden': 'true' }, String(g.scaleMax)));
    }

    return h(
      'div',
      { className: cls, role: 'img', 'aria-label': str(g.ariaLabel) || undefined, title: str(g.title) || undefined },
      h('div', { className: 'rating-gauge-track' }, marks)
    );
  }

  /** @type {import('./types/node-kit').ReactNodeDefinition} */
  var RatingGauge = {
    name: KIT + '.RatingGauge',
    displayNodeName: 'Course: Rating gauge',
    docs:
      'Where a judgement sits on the agreed scale, and how far it is from the goal — as a LENGTH nobody has to convert. The track is the whole scale and is the same width on every row, so two dimensions with different targets are read against one ruler. Four kinds of mark: the track, the fill, the score, and the goal as a LINE. It computes nothing — every position arrives as a fraction from Logic/Standing. No percentage, ever, and colour only ever celebrates.',
    noodlNodeAsProp: true,
    getReactComponent: function () {
      return function RatingGaugeNode(props) {
        var el = useRoot(props);
        return h('div', { ref: el, className: 'dbt-rating-gauge', style: props.style }, h(RatingGaugeView, props));
      };
    },
    inputProps: {
      gauge: obj('Gauge', {
        description:
          'One gauge, already measured: { score, target, hasScore, hasTarget, scoreFraction, targetFraction, approach, atTarget, scale, scaleMin, scaleMax, showHighEnd, goalLabel, ariaLabel, title, earlier[{score,fraction,title,ariaLabel}] }. Logic/Standing builds it.'
      })
    },
    outputProps: {}
  };

  /** @type {import('./types/node-kit').NodeKitModule} */
  var kit = {
    reactNodes: h
      ? [
          Reading_,
          Callout_,
          AnswerCapsule_,
          CodeBlock_,
          Quiz_,
          Activity_,
          Mermaid_,
          SvgDiagram_,
          Chart_,
          Widget_,
          AnnotatedScreenshot_,
          CuratedVideo_,
          HumanRecording_,
          Audio_,
          VoiceInteraction_,
          Capture_,
          PrepPack_,
          ArtifactChallenge_,
          HandoverPack_,
          Section,
          TimelineRow,
          PaceTracker,
          RatingGauge
        ]
      : []
  };

  if (typeof Noodl !== 'undefined' && Noodl.defineModule) {
    Noodl.defineModule(kit);
  }
  // For a plain-Node test: the kinds this kit renders, in one place.
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { KINDS: Object.keys(RENDERERS), resolveEmbed: resolveEmbed, kit: kit };
  }
})();
