"""
PARKGUARD - Smart Validation Engine
Implements both Formal Deterministic Finite Automaton (DFA) state-transition simulations
and regular expression (Regex) validation with full execution traces and agreement checks.
"""

import re
from typing import Dict, Any, List, Optional, Tuple

class DFASimulationResult:
    def __init__(
        self,
        is_valid: bool,
        current_state: str,
        state_history: List[Dict[str, Any]],
        start_state: str,
        accept_states: List[str],
        error_step: Optional[int] = None,
        error_reason: Optional[str] = None,
        description: str = ""
    ):
        self.is_valid = is_valid
        self.current_state = current_state
        self.state_history = state_history
        self.start_state = start_state
        self.accept_states = accept_states
        self.error_step = error_step
        self.error_reason = error_reason
        self.description = description

    def to_dict(self) -> Dict[str, Any]:
        return {
            "is_valid": self.is_valid,
            "final_state": self.current_state,
            "start_state": self.start_state,
            "accept_states": list(self.accept_states),
            "state_history": self.state_history,
            "error_step": self.error_step,
            "error_reason": self.error_reason,
            "description": self.description,
            "total_steps": len(self.state_history)
        }

class DFA:
    """
    Formal Deterministic Finite Automaton (DFA) M = (Q, Sigma, delta, q0, F)
    """
    def __init__(
        self,
        states: List[str],
        start_state: str,
        accept_states: List[str],
        transition_fn,
        description: str = ""
    ):
        self.states = set(states)
        self.start_state = start_state
        self.accept_states = set(accept_states)
        self.transition_fn = transition_fn  # callable(current_state, char) -> next_state or None
        self.description = description

    def simulate(self, input_string: str) -> DFASimulationResult:
        current_state = self.start_state
        state_history = []
        clean_input = input_string.strip() if input_string else ""

        if not clean_input:
            return DFASimulationResult(
                is_valid=(current_state in self.accept_states),
                current_state=current_state,
                state_history=[],
                start_state=self.start_state,
                accept_states=list(self.accept_states),
                error_step=0,
                error_reason="Input string is empty",
                description=self.description
            )

        for step, ch in enumerate(clean_input):
            prev_state = current_state
            next_state = self.transition_fn(current_state, ch)

            if next_state is None or next_state == "TRAP":
                state_history.append({
                    "step": step + 1,
                    "char": ch,
                    "from_state": prev_state,
                    "to_state": "TRAP",
                    "is_accept": False
                })
                return DFASimulationResult(
                    is_valid=False,
                    current_state="TRAP",
                    state_history=state_history,
                    start_state=self.start_state,
                    accept_states=list(self.accept_states),
                    error_step=step + 1,
                    error_reason=f"No valid transition from '{prev_state}' on symbol '{ch}' (step {step + 1})",
                    description=self.description
                )

            current_state = next_state
            state_history.append({
                "step": step + 1,
                "char": ch,
                "from_state": prev_state,
                "to_state": current_state,
                "is_accept": current_state in self.accept_states
            })

        is_valid = current_state in self.accept_states
        error_reason = None if is_valid else f"Simulation ended in non-accepting state '{current_state}'. Expected one of {list(self.accept_states)}."
        error_step = None if is_valid else len(clean_input)

        return DFASimulationResult(
            is_valid=is_valid,
            current_state=current_state,
            state_history=state_history,
            start_state=self.start_state,
            accept_states=list(self.accept_states),
            error_step=error_step,
            error_reason=error_reason,
            description=self.description
        )


# ==============================================================================
# 1. VEHICLE REGISTRATION NUMBER DFA & REGEX
# Format: [A-Z]{2}[- ]?[0-9]{2}[- ]?[A-Z]{1,2}[- ]?[0-9]{4}
# Example: DL-01-AB-1234, CA 12 XY 9876, NY04A1234
# ==============================================================================
VEHICLE_REGEX = r'^[A-Z]{2}[- ]?[0-9]{2}[- ]?[A-Z]{1,2}[- ]?[0-9]{4}$'

def _vehicle_dfa_transition(state: str, ch: str) -> Optional[str]:
    ch_upper = ch.upper()
    is_letter = 'A' <= ch_upper <= 'Z'
    is_digit = '0' <= ch_upper <= '9'
    is_sep = ch in ('-', ' ')

    if state == "Q_START":
        return "Q_L1" if is_letter else "TRAP"
    elif state == "Q_L1":
        return "Q_L2" if is_letter else "TRAP"
    elif state == "Q_L2":
        if is_sep:
            return "Q_SEP1"
        if is_digit:
            return "Q_D1"
        return "TRAP"
    elif state == "Q_SEP1":
        return "Q_D1" if is_digit else "TRAP"
    elif state == "Q_D1":
        return "Q_D2" if is_digit else "TRAP"
    elif state == "Q_D2":
        if is_sep:
            return "Q_SEP2"
        if is_letter:
            return "Q_S1"
        return "TRAP"
    elif state == "Q_SEP2":
        return "Q_S1" if is_letter else "TRAP"
    elif state == "Q_S1":
        if is_letter:
            return "Q_S2"
        if is_sep:
            return "Q_SEP3"
        if is_digit:
            return "Q_N1"
        return "TRAP"
    elif state == "Q_S2":
        if is_sep:
            return "Q_SEP3"
        if is_digit:
            return "Q_N1"
        return "TRAP"
    elif state == "Q_SEP3":
        return "Q_N1" if is_digit else "TRAP"
    elif state == "Q_N1":
        return "Q_N2" if is_digit else "TRAP"
    elif state == "Q_N2":
        return "Q_N3" if is_digit else "TRAP"
    elif state == "Q_N3":
        return "Q_ACCEPT" if is_digit else "TRAP"
    elif state == "Q_ACCEPT":
        return "TRAP"
    return "TRAP"

vehicle_dfa = DFA(
    states=[
        "Q_START", "Q_L1", "Q_L2", "Q_SEP1", "Q_D1", "Q_D2", 
        "Q_SEP2", "Q_S1", "Q_S2", "Q_SEP3", "Q_N1", "Q_N2", 
        "Q_N3", "Q_ACCEPT", "TRAP"
    ],
    start_state="Q_START",
    accept_states=["Q_ACCEPT"],
    transition_fn=_vehicle_dfa_transition,
    description="DFA for Vehicle Registration Number (e.g. DL-01-AB-1234 or CA12X9876)"
)


# ==============================================================================
# 2. VIOLATION CODE DFA & REGEX
# Format: (NPZ|IMP|PSM|OST|TOB)-[0-9]{3}
# ==============================================================================
VIOLATION_CODE_REGEX = r'^(NPZ|IMP|PSM|OST|TOB)-[0-9]{3}$'

def _violation_code_dfa_transition(state: str, ch: str) -> Optional[str]:
    ch_upper = ch.upper()
    is_digit = '0' <= ch_upper <= '9'

    if state == "V_START":
        if ch_upper == 'N': return "V_N"
        if ch_upper == 'I': return "V_I"
        if ch_upper == 'P': return "V_P"
        if ch_upper == 'O': return "V_O"
        if ch_upper == 'T': return "V_T"
        return "TRAP"
    elif state == "V_N":
        return "V_NP" if ch_upper == 'P' else "TRAP"
    elif state == "V_NP":
        return "V_CAT_DONE" if ch_upper == 'Z' else "TRAP"
    elif state == "V_I":
        return "V_IM" if ch_upper == 'M' else "TRAP"
    elif state == "V_IM":
        return "V_CAT_DONE" if ch_upper == 'P' else "TRAP"
    elif state == "V_P":
        return "V_PS" if ch_upper == 'S' else "TRAP"
    elif state == "V_PS":
        return "V_CAT_DONE" if ch_upper == 'M' else "TRAP"
    elif state == "V_O":
        return "V_OS" if ch_upper == 'S' else "TRAP"
    elif state == "V_OS":
        return "V_CAT_DONE" if ch_upper == 'T' else "TRAP"
    elif state == "V_T":
        return "V_TO" if ch_upper == 'O' else "TRAP"
    elif state == "V_TO":
        return "V_CAT_DONE" if ch_upper == 'B' else "TRAP"
    elif state == "V_CAT_DONE":
        return "V_HYPHEN" if ch == '-' else "TRAP"
    elif state == "V_HYPHEN":
        return "V_D1" if is_digit else "TRAP"
    elif state == "V_D1":
        return "V_D2" if is_digit else "TRAP"
    elif state == "V_D2":
        return "V_ACCEPT" if is_digit else "TRAP"
    elif state == "V_ACCEPT":
        return "TRAP"
    return "TRAP"

violation_code_dfa = DFA(
    states=[
        "V_START", "V_N", "V_NP", "V_I", "V_IM", "V_P", "V_PS", 
        "V_O", "V_OS", "V_T", "V_TO", "V_CAT_DONE", "V_HYPHEN", 
        "V_D1", "V_D2", "V_ACCEPT", "TRAP"
    ],
    start_state="V_START",
    accept_states=["V_ACCEPT"],
    transition_fn=_violation_code_dfa_transition,
    description="DFA for Parking Violation Codes: (NPZ|IMP|PSM|OST|TOB)-[0-9]{3}"
)


# ==============================================================================
# 3. PHONE NUMBER DFA & REGEX
# Format: ^\+?[0-9]{10,12}$
# ==============================================================================
PHONE_REGEX = r'^\+?[0-9]{10,12}$'

def _phone_dfa_transition(state: str, ch: str) -> Optional[str]:
    is_digit = '0' <= ch <= '9'

    if state == "P_START":
        if ch == '+': return "P_PLUS"
        if is_digit: return "P_1"
        return "TRAP"
    elif state == "P_PLUS":
        return "P_1" if is_digit else "TRAP"
    elif state.startswith("P_") and state[2:].isdigit():
        count = int(state[2:])
        if is_digit:
            next_count = count + 1
            if next_count <= 12:
                return f"P_{next_count}"
            return "TRAP"
        return "TRAP"
    return "TRAP"

phone_dfa = DFA(
    states=["P_START", "P_PLUS"] + [f"P_{i}" for i in range(1, 13)] + ["TRAP"],
    start_state="P_START",
    accept_states=["P_10", "P_11", "P_12"],
    transition_fn=_phone_dfa_transition,
    description="DFA for Phone Numbers: optional '+' followed by 10 to 12 digits"
)


# ==============================================================================
# 4. EMAIL ADDRESS DFA & REGEX
# Standard Email Format: ^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$
# ==============================================================================
EMAIL_REGEX = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'

def _email_dfa_transition(state: str, ch: str) -> Optional[str]:
    is_alnum = ('a' <= ch <= 'z') or ('A' <= ch <= 'Z') or ('0' <= ch <= '9')
    is_local_special = ch in ('.', '_', '%', '+', '-')
    is_domain_special = ch in ('-', '.')

    if state == "E_START":
        return "E_LOCAL" if is_alnum else "TRAP"
    elif state == "E_LOCAL":
        if ch == '@': return "E_AT"
        if is_alnum or is_local_special: return "E_LOCAL"
        return "TRAP"
    elif state == "E_AT":
        return "E_DOMAIN" if is_alnum else "TRAP"
    elif state == "E_DOMAIN":
        if ch == '.': return "E_DOT"
        if is_alnum or is_domain_special: return "E_DOMAIN"
        return "TRAP"
    elif state == "E_DOT":
        is_letter = ('a' <= ch <= 'z') or ('A' <= ch <= 'Z')
        return "E_TLD1" if is_letter else "TRAP"
    elif state == "E_TLD1":
        is_letter = ('a' <= ch <= 'z') or ('A' <= ch <= 'Z')
        return "E_TLD2_ACCEPT" if is_letter else "TRAP"
    elif state == "E_TLD2_ACCEPT":
        is_letter = ('a' <= ch <= 'z') or ('A' <= ch <= 'Z')
        if is_letter: return "E_TLD2_ACCEPT"
        if ch == '.': return "E_DOT"
        return "TRAP"
    return "TRAP"

email_dfa = DFA(
    states=["E_START", "E_LOCAL", "E_AT", "E_DOMAIN", "E_DOT", "E_TLD1", "E_TLD2_ACCEPT", "TRAP"],
    start_state="E_START",
    accept_states=["E_TLD2_ACCEPT"],
    transition_fn=_email_dfa_transition,
    description="DFA for Email Addresses"
)


# ==============================================================================
# UNIFIED VALIDATION CONTROLLER
# Runs DFA and Regex side-by-side, reports agreement, diagnostics & state history
# ==============================================================================
def validate_field(field_name: str, value: str) -> Dict[str, Any]:
    val_str = str(value).strip() if value is not None else ""

    if field_name == "vehicle_number":
        dfa_res = vehicle_dfa.simulate(val_str.upper())
        regex_valid = bool(re.match(VEHICLE_REGEX, val_str.upper()))
        rule_desc = "Must follow format like DL-01-AB-1234 or CA12X9876 (2 letters, 2 digits, 1-2 letters, 4 digits)"
    elif field_name == "violation_code":
        dfa_res = violation_code_dfa.simulate(val_str.upper())
        regex_valid = bool(re.match(VIOLATION_CODE_REGEX, val_str.upper()))
        rule_desc = "Must match format (NPZ|IMP|PSM|OST|TOB)-XXX with 3 digits, e.g., NPZ-101"
    elif field_name == "phone":
        dfa_res = phone_dfa.simulate(val_str)
        regex_valid = bool(re.match(PHONE_REGEX, val_str))
        rule_desc = "Must be 10-12 digits with optional leading '+'"
    elif field_name == "reporter_email":
        dfa_res = email_dfa.simulate(val_str)
        regex_valid = bool(re.match(EMAIL_REGEX, val_str))
        rule_desc = "Must be a valid email address with @ and domain extension (e.g. user@city.gov)"
    else:
        # Generic required check
        is_valid = len(val_str) > 0
        return {
            "field": field_name,
            "value": val_str,
            "is_valid": is_valid,
            "regex_valid": is_valid,
            "dfa_valid": is_valid,
            "agreement": True,
            "message": "Field is required" if not is_valid else "Valid",
            "dfa": None
        }

    agreement = (dfa_res.is_valid == regex_valid)

    message = "Validation passed" if (dfa_res.is_valid and regex_valid) else (
        dfa_res.error_reason or f"Invalid format for {field_name}. {rule_desc}"
    )

    return {
        "field": field_name,
        "value": val_str,
        "is_valid": (dfa_res.is_valid and regex_valid),
        "regex_valid": regex_valid,
        "dfa_valid": dfa_res.is_valid,
        "agreement": agreement,
        "message": message,
        "rule_description": rule_desc,
        "dfa": dfa_res.to_dict()
    }


def validate_report_submission(data: Dict[str, Any]) -> Tuple[bool, Dict[str, Any], List[str]]:
    """
    Validates complete report submission payload.
    Returns: (is_all_valid, field_results, error_messages)
    """
    required_fields = [
        "reporter_name", "reporter_email", "phone", 
        "vehicle_number", "vehicle_type", "zone", 
        "violation_code", "description"
    ]

    field_results = {}
    errors = []

    for field in required_fields:
        val = data.get(field, "")
        if not val or not str(val).strip():
            errors.append(f"Missing required field: '{field}'")
            field_results[field] = {
                "field": field,
                "value": "",
                "is_valid": False,
                "message": "This field is required",
                "dfa_valid": False,
                "regex_valid": False,
                "agreement": True
            }
        else:
            res = validate_field(field, str(val).strip())
            field_results[field] = res
            if not res["is_valid"]:
                errors.append(f"{field}: {res['message']}")

    # Overall validity
    is_all_valid = (len(errors) == 0)
    return is_all_valid, field_results, errors

