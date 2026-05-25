# Prompt Builder for Mentor Engine

The `prompt_builder.py` module builds all system and user prompts used by the Radidone mentor engine across the five learning phases.

## Overview

The Radidone platform guides students through a **Socratic dialogue** across five distinct phases:

1. **Observation** - Student identifies visible radiographic structures and anomalies
2. **Hypothesis** - Student proposes differential diagnoses based on observations
3. **Diagnosis** - Student selects and justifies a primary diagnosis
4. **Reflection** - Student reviews AI findings vs. their own annotations
5. **Evaluation** - Mentor scores the session and provides overall feedback

Each phase has:
- A **system prompt** that defines the mentor's behavior and instructions
- A **user prompt** that contains Socratic questions and guidance for the student

## Usage

### Command Line

Display all prompts for all phases:
```bash
python3 prompt_builder.py
```

Display prompts for a specific phase:
```bash
python3 prompt_builder.py observation
python3 prompt_builder.py hypothesis
python3 prompt_builder.py diagnosis
python3 prompt_builder.py reflection
python3 prompt_builder.py evaluation
```

### Python Module

#### Build all prompts
```python
from prompt_builder import build_all_prompts

all_prompts = build_all_prompts()
# Returns: Dict[str, Prompt]
# Keys: 'observation', 'hypothesis', 'diagnosis', 'reflection', 'evaluation'
```

#### Build a single prompt with context
```python
from prompt_builder import build_prompt, SessionPhase, PromptContext

context = PromptContext(
    phase=SessionPhase.HYPOTHESIS,
    student_name="Alice",
    student_annotations=["Bone loss at tooth 15", "Caries at tooth 45"],
    previous_responses=["Observed moderate bone loss"]
)

prompt = build_prompt(SessionPhase.HYPOTHESIS, context)
print(prompt.system)  # System instructions for mentor
print(prompt.user)    # User prompt with student annotations
```

#### Get individual prompts
```python
from prompt_builder import get_system_prompt, get_user_prompt, SessionPhase

# Get just the system prompt
system = get_system_prompt(SessionPhase.OBSERVATION)

# Get just the user prompt
user = get_user_prompt(SessionPhase.DIAGNOSIS)
```

#### Format for LLM API
```python
from prompt_builder import build_prompt, format_prompt_for_llm, SessionPhase

prompt = build_prompt(SessionPhase.DIAGNOSIS)
llm_input = format_prompt_for_llm(prompt)
# Returns: {'system': '...', 'user': '...', 'phase': 'diagnosis'}
```

## Data Structures

### SessionPhase (Enum)
```python
class SessionPhase(Enum):
    OBSERVATION = "observation"
    HYPOTHESIS = "hypothesis"
    DIAGNOSIS = "diagnosis"
    REFLECTION = "reflection"
    EVALUATION = "evaluation"
```

### Prompt (Dataclass)
```python
@dataclass
class Prompt:
    system: str              # Mentor behavior instructions
    user: str                # Socratic question/guidance
    phase: SessionPhase      # Which phase this prompt is for
```

### PromptContext (Dataclass)
```python
@dataclass
class PromptContext:
    phase: SessionPhase
    student_name: Optional[str] = None
    tooth_findings: Optional[List[str]] = None
    student_annotations: Optional[List[str]] = None
    ai_predictions: Optional[Dict[str, Any]] = None
    previous_responses: Optional[List[str]] = None
    conversation_history: Optional[List[Dict[str, str]]] = None
```

## Integration with Mentor Engine

The prompt builder is designed to be used by the **Prompt Assembler** component of the Mentor Engine:

```
Session Context → Prompt Builder → Prompts → LLM Client → Mentor Response
                                    ↑
                          Builds phase-aware system + user prompts
```

### Example Integration

```python
from prompt_builder import build_prompt, format_prompt_for_llm, SessionPhase, PromptContext

# In the Prompt Assembler
class PromptAssembler:
    def assemble_prompts(self, session):
        context = PromptContext(
            phase=session.current_phase,
            student_name=session.student_name,
            student_annotations=session.annotations,
            ai_predictions=session.ai_results,
            previous_responses=session.previous_responses,
            conversation_history=session.messages
        )
        
        prompt = build_prompt(session.current_phase, context)
        return format_prompt_for_llm(prompt)
```

## Prompt Philosophy

### Socratic Method
- Ask questions rather than provide answers
- Guide discovery of diagnostic reasoning
- Progressive revelation of findings based on phase
- Encourage metacognitive reflection

### Phase-Specific Behavior

**Observation Phase**
- Focus on identifying visible structures
- Never reveal AI predictions
- Encourage systematic observation habits
- Ask about bone levels, tooth positions, anomalies

**Hypothesis Phase**
- Ask about clinical significance of findings
- Encourage multiple hypotheses generation
- Connect observations to pathology
- Discuss probabilities and likelihood

**Diagnosis Phase**
- Guide selection of primary diagnosis
- Ask for justification with evidence
- Explore why other hypotheses are less likely
- Discuss diagnostic confidence

**Reflection Phase**
- Reveal AI diagnostic predictions
- Guide comparison and analysis
- Use as learning opportunity
- Support constructive reflection

**Evaluation Phase**
- Provide overall assessment
- Score reasoning quality
- Highlight strengths and improvements
- Summarize key learning points

## Testing

Run the comprehensive test suite:
```bash
cd apps/mentor-engine
python3 prompt_builder.py  # View all prompts
```

Or import and test programmatically:
```python
from prompt_builder import build_all_prompts, PromptContext, build_prompts_with_context

# Build all prompts
all_prompts = build_all_prompts()
assert len(all_prompts) == 5

# Build with context
context = PromptContext(student_name="Dr. Smith")
context_prompts = build_prompts_with_context(context)
assert all(p.system for p in context_prompts.values())
assert all(p.user for p in context_prompts.values())
```

## Future Enhancements

- [ ] Multi-language prompt support
- [ ] Customizable rubric templates for evaluation
- [ ] Prompt versioning for A/B testing
- [ ] Dynamic prompt adjustment based on student skill level
- [ ] Integration with response parser for real-time feedback
- [ ] Telemetry on prompt effectiveness

## License

MIT License — see [LICENSE](../../LICENSE) for details.
