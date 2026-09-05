#!/usr/bin/env python3
"""Check that the kit's documentation describes the kit that is actually here.

Every claim in this repo is read by an agent that cannot see the code first. A
helper named in SKILL.md that does not exist, or a path that 404s, does not fail
loudly: the agent writes a call to it, gets a ReferenceError from inside a
browser sandbox, and spends a turn deciding whether the whole kit is broken.

`contrast()` and `lum()` were advertised in three places, including from the
server, for the entire first release. They did not exist. Nothing caught it
because everything that was checked — do the URLs resolve, does the JS parse —
was true. This checks the claims against the contents.
"""

import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
KIT = ROOT / "plugins" / "peirce-design-kit"
SKILL_DIR = KIT / "skills" / "penpot-mcp"

# Generated per design system by `peirce-run tokens-pull`, deliberately absent:
# the token data belongs to the user's file, not to this kit.
EXPECTED_ABSENT = {"lib/tokens.js"}

# The server hands agents raw.githubusercontent URLs built from these paths. It
# lives in another repository and cannot test them, so this side holds the
# contract: moving one of these silently breaks every agent that is told to read
# the source instead of installing the plugin.
ADVERTISED_BY_SERVER = [
    "lib/lib.js",
    "recipes",
    "reference/handbook.md",
]

problems = []


def fail(message):
    problems.append(message)


def defined_in(path):
    """Top-level function names in a script, ignoring _private ones."""
    source = path.read_text()
    return {
        name
        for name in re.findall(r"^function\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(", source, re.M)
        if not name.startswith("_")
    }


def section(markdown, heading):
    body = markdown.split(heading, 1)
    if len(body) == 1:
        return None
    return body[1].split("\n## ", 1)[0]


# 1. The helpers SKILL.md advertises are the helpers lib.js defines.
lib = SKILL_DIR / "lib" / "lib.js"
skill = (SKILL_DIR / "SKILL.md").read_text()
helpers_section = section(skill, "## What lib.js gives you")

if helpers_section is None:
    fail("SKILL.md has no 'What lib.js gives you' section to check against lib.js")
else:
    documented = set(re.findall(r"`([a-z][A-Za-z0-9_]*)\(", helpers_section))
    defined = defined_in(lib)
    for name in sorted(documented - defined):
        fail(f"SKILL.md advertises {name}(), which lib.js does not define")
    for name in sorted(defined - documented):
        fail(f"lib.js defines {name}(), which SKILL.md never mentions")

# 2. The recipe table names the recipes that exist, and all of them.
recipes = {p.stem for p in (SKILL_DIR / "recipes").glob("*.js")}
table = section(skill, "## Recipes") or ""
listed = set(re.findall(r"^\| `([a-z-]+)` \|", table, re.M))
for name in sorted(listed - recipes):
    fail(f"SKILL.md lists the recipe `{name}`, which does not exist")
for name in sorted(recipes - listed):
    fail(f"recipes/{name}.js exists but SKILL.md never lists it")

# 3. Every repo path either document mentions actually resolves.
for doc in [SKILL_DIR / "SKILL.md", SKILL_DIR / "reference" / "handbook.md"]:
    for ref in sorted(set(re.findall(r"`([A-Za-z0-9_.-]+/[A-Za-z0-9_./-]+)`", doc.read_text()))):
        if ref in EXPECTED_ABSENT or ref.startswith("mcp__"):
            continue
        if not (SKILL_DIR / ref).exists() and not (KIT / ref).exists():
            fail(f"{doc.name} points at {ref}, which is not in the repository")

# 4. The paths the server hands out are still here.
for ref in ADVERTISED_BY_SERVER:
    if not (SKILL_DIR / ref).exists():
        fail(f"{ref} is advertised by the MCP server's raw urls and has moved or gone")

if problems:
    print("\n".join(f"  {p}" for p in problems))
    sys.exit(f"\n{len(problems)} claim(s) the repository does not support")

print("docs match the code")
