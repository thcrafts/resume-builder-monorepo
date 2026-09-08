# Resumes workflow



## Purpose



Create and manage tailored resumes: **chunked** async AI generation (SSE kickoff + Socket.IO progress/completion), manual from-JSON PDF creation, retry of failed AI jobs, list filters, application Q&A, downloads, and cover letters. There is **no** generic `POST /api/resumes` create endpoint.



## Actors



| Actor | Role |

|-------|------|

| Authenticated user | Owns resumes scoped by `userId`; stores candidate profile on User |

| ResumesController | HTTP + SSE |

| ResumeGenerationService | Background orchestration entry |

| ChunkedResumeBuilder | Title → summary → skills → experience (parallel) |

| ResumesService | CRUD, filters, download, cover letter orchestration |

| ResumesGateway | Emits `generate:progress` / `generate:done` / `generate:failed` |

| PromptRegistryService | Optional short industry overlay (not full 11KB prompts) |

| AiService / OpenRouter | Per-step model inference |

| Frontend resume list / CreateResume | Listens to sockets; generate page uses SSE |



## Sequence diagrams



### Generate (chunked SSE + background + socket)



```mermaid

sequenceDiagram

  participant UI as CreateResume

  participant API as ResumesController

  participant Svc as ResumesService

  participant Gen as ResumeGenerationService

  participant Orch as ChunkedResumeBuilder

  participant OR as OpenRouter

  participant GW as ResumesGateway

  participant List as Resumes list



  UI->>API: POST /api/resumes/generate (SSE)

  API->>Svc: validateApiKeyForGeneration

  API->>Svc: createInProgress(... status in_progress)

  API-->>UI: data: {type:started, resumeId}

  API-->>UI: end SSE stream

  Note over Gen: async after response closed

  Gen->>Orch: validateCandidateProfile then run steps

  Orch->>OR: title match (gpt-4o-mini)

  Orch->>GW: emitProgress(title)

  Orch->>OR: summary (claude-sonnet-4.6)

  Orch->>OR: skills (gpt-4o-mini)

  par Experience x N (concurrency 3)

    Orch->>OR: experience (gpt-5.4-mini / fallback)

  end

  Orch->>Orch: assembleResumeJson + normalize bullets

  alt success

    Gen->>Svc: updateResumeWithGeneratedData + generationMeta

    Gen->>GW: emitDone(id)

    GW-->>List: generate:done {id}

  else failure

    Gen->>Svc: markResumeFailed

    Svc->>GW: emitFailed(id, message)

    GW-->>List: generate:failed {id,message}

  end

```



### From JSON



```mermaid

sequenceDiagram

  participant UI as CreateResume fromJson

  participant API as ResumesController

  participant Svc as ResumesService



  UI->>API: POST /api/resumes/from-json

  API->>API: strip cover_letter; fix mailto email

  API->>Svc: create(..., status completed, generationSource manual)

  Svc-->>UI: PDF attachment (application/pdf)

```



### Retry failed AI resume



```mermaid

sequenceDiagram

  participant UI as Resumes list

  participant API as ResumesController

  participant Svc as ResumesService

  participant Gen as ResumeGenerationService



  UI->>API: POST /api/resumes/:id/retry

  API->>Svc: retryResume

  alt not failed / manual / missing key

    Svc-->>UI: 400/404

  else ok

    Svc->>Svc: status=in_progress, unset failureMessage

    Svc->>Gen: generateResume(..., industry default)

    API-->>UI: {message: Resume generation restarted}

  end

```



## Key files



| Path | Notes |

|------|--------|

| `apps/backend/src/resumes/chunked-resume.builder.ts` | Multi-step orchestration |

| `apps/backend/src/ai/assemble-resume-json.ts` | Merge profile + AI chunks |

| `apps/backend/src/resumes/resume-generation.service.ts` | Async generation pipeline |

| `apps/backend/src/resumes/resumes.gateway.ts` | Socket.IO emits |

| `apps/frontend/src/pages/resumes/` | List + CreateResume |

| `packages/shared/src/candidate-profile.ts` | Profile types + validator |



## Static vs AI fields



**From profile (never AI-written):** name, primary contact, education, certifications, company shell (name, dates, job_type, product, mission).



**AI-generated:** root title (optional adjust), summary, skills (from baseline), experience achievements/skills per company.



## WebSocket events



| Event | Payload |

|-------|---------|

| `generate:progress` | `{ id, step: title\|summary\|skills\|experience, index?, total? }` |

| `generate:done` | `{ id }` |

| `generate:failed` | `{ id, message? }` |



## Error cases



| Case | Behavior |

|------|----------|

| Incomplete candidate profile | Fail before any OpenRouter call; actionable error list |

| No OpenRouter key | `400` before work starts |

| One experience call fails | Fail whole job with company name in message |

| JSON parse fail on a step | Retry once with stricter JSON; then mark failed |

| from-json path | Unchanged; bypasses chunked builder |



## MongoDB data



**Resume** adds optional `generationMeta: { chunked: true, steps: [...] }`.



**User** stores `contacts[]`, `candidateProfile`, `companies[]`, `experiencePrompt`.


