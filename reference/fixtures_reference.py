#!/usr/bin/env python3
"""Independent reference for Challenge Fit Simulator fixtures A-F.

Uses Python's exact `fractions.Fraction` arithmetic (no floating point) and two
methods: (1) a dynamic programme over rational P&L states, and (2) with --brute,
an exhaustive enumeration of all 2^N outcome sequences. Both must agree exactly.

    python3 reference/fixtures_reference.py           # DP only (fast)
    python3 reference/fixtures_reference.py --brute   # DP + brute force (~3 min for N=20)
"""
import sys
from fractions import Fraction as F
from itertools import product


def dp(p, w, l, r, T, D, N, c=F(0)):
    win, loss = r * (w - c), -r * (l + c)
    act, ps, fs = {F(0): F(1)}, F(0), F(0)
    for _ in range(N):
        nxt = {}
        for s, m in act.items():
            for d, q in ((win, p), (loss, 1 - p)):
                t, mm = s + d, m * q
                if t >= T:
                    ps += mm
                elif t <= -D:
                    fs += mm
                else:
                    nxt[t] = nxt.get(t, F(0)) + mm
        act = nxt
    return ps, fs, sum(act.values(), F(0))


def brute(p, w, l, r, T, D, N):
    out = {"p": F(0), "f": F(0), "u": F(0)}
    for path in product((1, 0), repeat=N):
        s, res, prob = F(0), "u", F(1)
        for x in path:
            prob *= p if x else 1 - p
            if res == "u":
                s += r * w if x else -r * l
                if s >= T:
                    res = "p"
                elif s <= -D:
                    res = "f"
        out[res] += prob
    return out["p"], out["f"], out["u"]


TEN = F(1, 10)
FIXTURES = {
    "A": (F(1, 2), F(3), F(1), F(1, 100), 10),
    "B": (F(1, 2), F(3), F(1), F(1, 100), 20),
    "C": (F(1, 2), F(3), F(1), F(5, 1000), 20),
    "D": (F(7, 10), F(1), F(1), F(1, 100), 10),
    "E": (F(7, 10), F(1), F(1), F(5, 1000), 20),
    "F": (F(3, 10), F(5), F(1), F(1, 100), 20),
}

if __name__ == "__main__":
    do_brute = "--brute" in sys.argv
    for name, (p, w, l, r, N) in FIXTURES.items():
        a = dp(p, w, l, r, TEN, TEN, N)
        if do_brute:
            assert a == brute(p, w, l, r, TEN, TEN, N), name
        print(name, " ".join(f"{float(x):.12f}" for x in a), " | exact:", " ".join(str(x) for x in a))
    print("brute-force agreement:", "verified" if do_brute else "skipped (pass --brute)")
