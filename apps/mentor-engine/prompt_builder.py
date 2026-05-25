#!/usr/bin/env python3
"""
prompt_builder.py
-----------------
Builds all prompts used by the mentor engine across the five learning phases.

The Radidone platform guides students through a Socratic dialogue across five phases:
1. Observation  - Student identifies visible structures and anomalies
2. Hypothesis   - Student proposes differential diagnoses
3. Diagnosis    - Student selects and justifies a primary diagnosis
4. Reflection   - Student reviews AI findings vs. their own annotations
5. Evaluation   - Mentor scores the session and provides overall feedback

Each phase has a system prompt (mentor behavior/instructions) and user prompts
(Socratic questions and guidance for the student).
"""

from enum import Enum
from typing import Optional, Dict, List, Any
from dataclasses import dataclass, replace


# ── Constants ────────────────────────────────────────────────────────────────

# Evaluation criteria thresholds (used in evaluation phase prompts)
MIN_ANNOTATIONS_FOR_STRONG_OBSERVATION = 3
MIN_ANNOTATIONS_FOR_DEVELOPING_OBSERVATION = 1


# ── Enums ────────────────────────────────────────────────────────────────────

class SessionPhase(Enum):
    """The five phases of a Socratic learning session."""
    OBSERVATION = "observation"
    HYPOTHESIS = "hypothesis"
    DIAGNOSIS = "diagnosis"
    REFLECTION = "reflection"
    EVALUATION = "evaluation"


# ── Data Structures ──────────────────────────────────────────────────────────

@dataclass
class Prompt:
    """A prompt with both system and user components."""
    system: str
    user: str
    phase: SessionPhase


@dataclass
class PromptContext:
    """Context for building phase-aware prompts."""
    phase: SessionPhase
    student_name: Optional[str] = None
    tooth_findings: Optional[List[str]] = None
    student_annotations: Optional[List[str]] = None
    ai_predictions: Optional[Dict[str, Any]] = None
    previous_responses: Optional[List[str]] = None
    conversation_history: Optional[List[Dict[str, str]]] = None


# ── System Prompts (Mentor Behavior Instructions) ──────────────────────────

def get_observation_system_prompt() -> str:
    """
    System prompt for the Observation phase.
    
    The mentor guides the student to identify visible radiographic structures
    and anomalies WITHOUT revealing AI predictions.
    """
    return """You are an expert dental educator and Socratic mentor guiding a student through
radiographic interpretation training. You are currently in the OBSERVATION phase.

Your role in this phase:
- Guide the student to identify visible radiographic structures and anomalies
- Ask open-ended, leading questions that encourage careful visual analysis
- Never reveal AI predictions or hidden findings at this stage
- Focus on what is immediately visible on the radiograph
- Encourage the student to look at tooth-by-tooth details, bone levels, etc.
- Correct misidentifications gently and redirect observation
- Progressively reveal structures as the student demonstrates understanding

Guidelines:
- Use Socratic questioning (ask questions rather than provide answers)
- Be encouraging and supportive
- Guide without lecturing
- Help the student develop systematic observation habits
- Focus on radiographic anatomy and normal variations first"""


def get_hypothesis_system_prompt() -> str:
    """
    System prompt for the Hypothesis phase.
    
    The mentor guides the student to propose differential diagnoses based on
    their observations.
    """
    return """You are an expert dental educator and Socratic mentor. You are now in the HYPOTHESIS phase.

Your role in this phase:
- Guide the student to propose differential diagnoses based on their observations
- Ask about the clinical significance of observed findings
- Encourage the student to generate multiple hypotheses
- Ask "What conditions could cause this finding?" type questions
- Connect observations to pathology concepts
- Help the student think about probabilities and likelihood
- Do NOT yet reveal which diagnosis is correct
- Guide reasoning about differential diagnosis process

Guidelines:
- Use Socratic questioning
- Encourage critical thinking about what findings mean clinically
- Help develop diagnostic reasoning skills
- Ask about risk factors, typical presentations
- Avoid confirming or denying hypotheses prematurely"""


def get_diagnosis_system_prompt() -> str:
    """
    System prompt for the Diagnosis phase.
    
    The mentor guides the student to select and justify a primary diagnosis.
    """
    return """You are an expert dental educator and Socratic mentor. You are now in the DIAGNOSIS phase.

Your role in this phase:
- Guide the student to select and justify a primary diagnosis
- Ask the student to explain their reasoning for the chosen diagnosis
- Explore the student's understanding of why this is the most likely diagnosis
- Ask about supporting evidence from the radiograph
- Help the student consider why other hypotheses are less likely
- Guide discussion of treatment implications
- Allow for nuanced discussion of diagnostic confidence

Guidelines:
- Encourage the student to defend their diagnosis with evidence
- Ask about pathognomonic vs non-specific findings
- Explore clinical context and presentation
- Help develop diagnostic justification skills
- Guide toward evidence-based reasoning"""


def get_reflection_system_prompt() -> str:
    """
    System prompt for the Reflection phase.
    
    The mentor reveals AI findings and guides the student to compare their
    diagnosis with AI predictions.
    """
    return """You are an expert dental educator and Socratic mentor. You are now in the REFLECTION phase.

Your role in this phase:
- Reveal AI diagnostic predictions and findings
- Guide the student to compare their diagnosis with AI findings
- Help the student understand where they aligned and where they differed
- Explore why discrepancies exist (if any)
- Use this as a learning opportunity
- Discuss confidence levels and uncertainty
- Highlight what the student did well
- Guide constructive reflection on missed or over-called findings

Guidelines:
- Be supportive when discussing discrepancies
- Focus on learning, not grading
- Help the student understand AI capabilities and limitations
- Discuss heatmaps and confidence scores
- Encourage meta-cognitive reflection
- Use as opportunity for knowledge consolidation"""


def get_evaluation_system_prompt() -> str:
    """
    System prompt for the Evaluation phase.
    
    The mentor provides overall feedback and scores the session.
    """
    return """You are an expert dental educator and Socratic mentor. You are now in the EVALUATION phase.

Your role in this phase:
- Provide overall assessment of the student's performance
- Score diagnostic reasoning quality based on rubric
- Highlight strengths and areas for improvement
- Synthesize learning points from the session
- Provide actionable feedback for future practice
- Encourage continued learning
- Summarize key clinical lessons

Scoring rubric (you will assign points):
- Observation accuracy: Did the student identify key findings?
- Hypothesis generation: Did the student generate reasonable differential diagnoses?
- Diagnostic reasoning: Was the diagnosis justified with appropriate evidence?
- Self-reflection: Did the student engage constructively with AI findings?
- Overall radiographic interpretation: Quality of diagnostic conclusion

Guidelines:
- Provide balanced, constructive feedback
- Celebrate progress and effort
- Identify specific areas for focused improvement
- Encourage metacognition about learning process
- End on a positive, motivational note"""


# ── User Prompt Builders ─────────────────────────────────────────────────────

def build_observation_user_prompt(context: PromptContext) -> str:
    """Build the initial user prompt for the Observation phase."""
    student_name = context.student_name or "Student"
    
    base_prompt = (
        f"Hello {student_name}! Welcome to your dental radiography learning session.\n\n"
        f"You have a panoramic X-ray to analyze. Let's start with careful observation.\n\n"
        f"Please look at the radiograph and tell me: What do you notice first? Start with the overall "
        f"structure of the radiograph—look at the bone levels, tooth positioning, and any obvious anomalies."
    )
    
    ai_note = (
        "\n\n(Note: An AI analysis exists but will be revealed later—right now, use your own eyes)"
        if context.ai_predictions
        else ""
    )
    
    return base_prompt + ai_note


def build_hypothesis_user_prompt(context: PromptContext) -> str:
    """Build the user prompt for the Hypothesis phase."""
    student_name = context.student_name or "Student"
    
    base_prompt = (
        f"Good observation, {student_name}!\n\n"
        f"Now that you've identified several findings, let's explore what these findings might mean clinically.\n\n"
        f"Based on the anomalies you've identified, what are some possible diagnoses? "
        f"Think about:\n"
        f"- What conditions commonly present with these findings?\n"
        f"- What is the differential diagnosis?\n"
        f"- Which diagnosis seems most likely based on the radiographic evidence?"
    )
    
    annotations_note = ""
    if context.student_annotations:
        annotations_note = f"\n\nYou've annotated: {', '.join(context.student_annotations[:3])}"
    
    return base_prompt + annotations_note


def build_diagnosis_user_prompt(context: PromptContext) -> str:
    """Build the user prompt for the Diagnosis phase."""
    student_name = context.student_name or "Student"
    
    prompt = f"""Excellent reasoning, {student_name}!

Now let's narrow down to your primary diagnosis. 

Which diagnosis do you think is MOST likely, and why? 
Please explain:
- What specific radiographic findings support this diagnosis?
- Why did you rule out the other possibilities?
- How confident are you in this diagnosis?"""
    
    return prompt


def build_reflection_user_prompt(context: PromptContext) -> str:
    """Build the user prompt for the Reflection phase with AI findings revealed."""
    student_name = context.student_name or "Student"
    
    # Simulate AI predictions for illustration
    ai_summary = "AI predictions have been generated"
    if context.ai_predictions:
        ai_summary = f"AI findings: {context.ai_predictions.get('summary', 'Multiple findings detected')}"
    
    prompt = f"""Now let's see how your interpretation compares with the AI analysis.

{ai_summary}

{student_name}, let's reflect:
- How does your diagnosis align with the AI findings?
- Were there findings you missed? Why do you think that happened?
- Were there findings you identified that the AI didn't emphasize?
- What did you learn from this comparison?"""
    
    return prompt


def build_evaluation_user_prompt(context: PromptContext) -> str:
    """Build the user prompt for the Evaluation phase."""
    student_name = context.student_name or "Student"
    
    # Determine observation quality based on annotation count
    observation_quality = (
        "strong"
        if context.student_annotations and len(context.student_annotations) >= MIN_ANNOTATIONS_FOR_STRONG_OBSERVATION
        else "developing"
    )
    
    reasoning_quality = "solid" if context.previous_responses else "careful"
    reflection_quality = "insightful" if context.ai_predictions else "thoughtful"
    
    prompt = (
        f"Thank you for your thorough work, {student_name}!\n\n"
        f"Let's review your session performance:\n\n"
        f"Your observations were {observation_quality}\n"
        f"Your diagnostic reasoning showed {reasoning_quality} clinical thinking\n"
        f"Your reflection on the AI findings was {reflection_quality}\n\n"
        f"Overall assessment:\n"
        f"- Observation accuracy: [Score determined by session performance]\n"
        f"- Hypothesis generation: [Score determined by reasoning quality]\n"
        f"- Diagnostic justification: [Score determined by evidence presentation]\n"
        f"- Self-reflection: [Score determined by comparison accuracy]\n\n"
        f"Key learning points from this session:\n"
        f"1. [Key point 1]\n"
        f"2. [Key point 2]\n"
        f"3. [Key point 3]\n\n"
        f"Keep practicing! Consistent focused observation and systematic differential diagnosis thinking\n"
        f"will strengthen your radiographic interpretation skills."
    )
    
    return prompt


# ── Main Prompt Builder Interface ────────────────────────────────────────────

def build_prompt(
    phase: SessionPhase,
    context: Optional[PromptContext] = None,
    use_system_prompt: bool = True,
    use_user_prompt: bool = True
) -> Prompt:
    """
    Build a complete prompt for a given phase.
    
    Args:
        phase: The session phase
        context: Optional context for customizing prompts
        use_system_prompt: Whether to include system prompt
        use_user_prompt: Whether to include user prompt
    
    Returns:
        A Prompt object with system and user components
    """
    # Get system prompt based on phase
    system_prompts = {
        SessionPhase.OBSERVATION: get_observation_system_prompt(),
        SessionPhase.HYPOTHESIS: get_hypothesis_system_prompt(),
        SessionPhase.DIAGNOSIS: get_diagnosis_system_prompt(),
        SessionPhase.REFLECTION: get_reflection_system_prompt(),
        SessionPhase.EVALUATION: get_evaluation_system_prompt(),
    }
    
    # Get user prompt based on phase
    user_prompt_builders = {
        SessionPhase.OBSERVATION: build_observation_user_prompt,
        SessionPhase.HYPOTHESIS: build_hypothesis_user_prompt,
        SessionPhase.DIAGNOSIS: build_diagnosis_user_prompt,
        SessionPhase.REFLECTION: build_reflection_user_prompt,
        SessionPhase.EVALUATION: build_evaluation_user_prompt,
    }
    
    # Build context if not provided, or create a new one to avoid mutations
    if context is None:
        phase_context = PromptContext(phase=phase)
    else:
        # Use dataclasses.replace() to create a modified copy without mutations
        phase_context = replace(context, phase=phase)
    
    # Get system prompt
    system = system_prompts.get(phase, "")
    if not use_system_prompt:
        system = ""
    
    # Get user prompt
    user_prompt_builder = user_prompt_builders.get(phase)
    user = user_prompt_builder(phase_context) if user_prompt_builder and use_user_prompt else ""
    
    return Prompt(system=system, user=user, phase=phase)


# ── Helper Functions for Prompt Customization ────────────────────────────────

def build_all_prompts() -> Dict[str, Prompt]:
    """
    Build all prompts for all five phases.
    
    Returns:
        Dictionary mapping phase names to Prompt objects
    """
    prompts = {}
    for phase in SessionPhase:
        context = PromptContext(phase=phase)
        prompts[phase.value] = build_prompt(phase, context)
    
    return prompts


def build_prompts_with_context(context: PromptContext) -> Dict[str, Prompt]:
    """
    Build all prompts with custom context.
    
    Args:
        context: Context containing student info and session data
    
    Returns:
        Dictionary mapping phase names to customized Prompt objects
    """
    prompts = {}
    for phase in SessionPhase:
        prompts[phase.value] = build_prompt(phase, context)
    
    return prompts


def get_system_prompt(phase: SessionPhase) -> str:
    """Get just the system prompt for a phase."""
    prompt = build_prompt(phase, use_user_prompt=False)
    return prompt.system


def get_user_prompt(phase: SessionPhase, context: Optional[PromptContext] = None) -> str:
    """Get just the user prompt for a phase."""
    if context is None:
        context = PromptContext(phase=phase)
    prompt = build_prompt(phase, context, use_system_prompt=False)
    return prompt.user


def format_prompt_for_llm(prompt: Prompt) -> Dict[str, str]:
    """
    Format a prompt for LLM consumption.
    
    Args:
        prompt: The Prompt object
    
    Returns:
        Dictionary with 'system' and 'user' keys for LLM API
    """
    return {
        "system": prompt.system,
        "user": prompt.user,
        "phase": prompt.phase.value
    }


# ── CLI Entry Point ──────────────────────────────────────────────────────────

if __name__ == "__main__":
    """
    Script entry point for building and displaying all prompts.
    
    Usage:
        python3 prompt_builder.py [phase]
    
    If phase is omitted, all prompts are displayed.
    Valid phases: observation, hypothesis, diagnosis, reflection, evaluation
    """
    import sys
    
    if len(sys.argv) > 1:
        phase_name = sys.argv[1].lower()
        try:
            phase = SessionPhase(phase_name)
            prompt = build_prompt(phase)
            print(f"\n{'='*80}")
            print(f"PHASE: {phase.value.upper()}")
            print(f"{'='*80}\n")
            print("SYSTEM PROMPT:")
            print("-" * 80)
            print(prompt.system)
            print(f"\n{'='*80}\n")
            print("USER PROMPT:")
            print("-" * 80)
            print(prompt.user)
            print(f"\n{'='*80}\n")
        except ValueError:
            print(f"Invalid phase: {phase_name}")
            print("Valid phases: observation, hypothesis, diagnosis, reflection, evaluation")
            sys.exit(1)
    else:
        # Build and display all prompts
        all_prompts = build_all_prompts()
        for phase_name, prompt in all_prompts.items():
            print(f"\n{'='*80}")
            print(f"PHASE: {phase_name.upper()}")
            print(f"{'='*80}\n")
            print("SYSTEM PROMPT:")
            print("-" * 80)
            print(prompt.system)
            print(f"\n{'-'*80}\n")
            print("USER PROMPT:")
            print("-" * 80)
            print(prompt.user)
            print(f"\n{'='*80}\n")
