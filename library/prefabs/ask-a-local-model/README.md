# Ask a Local Model — setting it up

This prefab asks a language model on your own computer one question. The question is a sentence
you write, with one blank. The blank is filled from a list you give it. The answer is one word from
another list you give it. Nothing leaves the computer. No key is needed.

It runs in a cloud function. Place `/#__cloud__/Local Model/Ask` inside the function your page
calls. The page sends a choice from the list. It never sends words of its own.

## What you need running

A model server on the same computer that speaks the OpenAI chat format. Ollama is one. It is the
one this prefab was tried with (Ollama 0.34.4). With Ollama, pull a model first:

```
ollama pull qwen3:0.6b
```

Ollama listens on `http://127.0.0.1:11434`, which is the prefab's default `Base URL`.

## The inputs

| Input | What to give it |
|---|---|
| `Model` | The model's name as the server knows it, for example `qwen3:0.6b`. Required. |
| `Question` | A sentence containing `{choice}` exactly once, for example `What colour is {choice}?` |
| `Choices` | The list the page may choose from. Anything else is refused before the model is asked. |
| `Choice` | The page's choice, from the cloud function's request. |
| `Answers` | The words the model may answer with. |
| `Instructions` | Optional. Who the model is, for example `You are Olive, a friendly owl.` |
| `Base URL` | Optional. Another server on this computer, for example `http://127.0.0.1:8080`. |
| `Do` | The signal that asks. Wire the request's `Receive` to it. |

## What comes back

`Done` fires with `Answer` set to one word from `Answers`. `Failure` fires otherwise, with an
`Error Code` the app can branch on:

| Error Code | What happened |
|---|---|
| `not_on_the_list` | The page sent a choice that is not in `Choices`. The model was not asked. |
| `not_configured` | `Model` or `Answers` is empty, or `Question` has no `{choice}`. |
| `answer_not_allowed` | The model answered with a word that is not in `Answers`. |
| `network` | No server answered at `Base URL`. |
| `timeout` | The server took longer than 20 seconds. |

Wire `Failure` to whatever the app does without the model. A child's game can carry on without
it.

## Why it is built this way

A small model cannot be trusted to follow rules written in a prompt. This prefab does not ask it
to. The page can only pick from a list. The question is fixed. The server is sent the list of answers as a JSON
schema. Some servers ignore the schema, so this prefab checks the answer against the list again.

Thinking is switched off (`Effort` is `None`). A thinking model such as Qwen 3 otherwise spends its
64 tokens thinking and answers nothing.

The request the page sends is kept on the backend's execution record. A choice from a list is safe
to keep there. A child's own words would not be, which is one more reason the page sends a choice.
