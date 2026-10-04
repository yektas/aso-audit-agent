use anyhow::Result;
use psychopomp::{
    author::{PlanBuilder, seconds},
    caption::{CaptionActor, CaptionAlign, CaptionPlan, CaptionSpanPlan},
    effects::spinner::Mark,
    math::easing::Ease,
    plan::{ReelPlan, ReelTransitionStyle, ScenePlan},
    rolling::{RollingNumberActor, RollingNumberPlan},
    stage::{StageActor, StageElement, StagePlan, StagePost, StatusText},
    tone::Tone,
};

fn card(
    id: &str,
    at: [f32; 3],
    size: [f32; 2],
    title: &str,
    detail: &str,
    tone: Tone,
) -> StageElement {
    StageElement::Card {
        id: id.into(),
        at,
        size,
        title: title.into(),
        status: vec![StatusText {
            text: detail.into(),
            tone: Tone::Muted,
        }],
        tone,
        mark: Mark::Check,
    }
}
fn label(id: &str, at: [f32; 3], size: f32, text: &str, tone: Tone) -> StageElement {
    StageElement::Label {
        id: id.into(),
        at,
        size,
        align: CaptionAlign::Center,
        spans: vec![CaptionSpanPlan::new(text, tone)],
    }
}
fn orb(id: &str, at: [f32; 3], radius: f32, tone: Tone) -> StageElement {
    StageElement::Orb {
        id: id.into(),
        at,
        radius,
        points: 360,
        tone,
    }
}
fn ring(id: &str, at: [f32; 3], radius: f32, tone: Tone) -> StageElement {
    StageElement::Ring {
        id: id.into(),
        at,
        radius,
        thickness: 3.0,
        tone,
    }
}
fn wire(id: &str, from: &str, to: &str, tone: Tone) -> StageElement {
    StageElement::Beam {
        id: id.into(),
        from: from.into(),
        to: to.into(),
        bend: 0.0,
        tone,
    }
}
fn packet(id: &str, beam: &str, tone: Tone) -> StageElement {
    StageElement::Packet {
        id: id.into(),
        beam: beam.into(),
        reverse: false,
        label: String::new(),
        tone,
    }
}
fn caption(
    sc: &mut PlanBuilder,
    id: &str,
    text: &str,
    at: [f32; 2],
    size: f32,
    tone: Tone,
    time: f64,
) -> Result<CaptionActor> {
    let mut c = CaptionActor::declare(
        sc,
        id,
        &CaptionPlan::line(at, size, vec![CaptionSpanPlan::new(text, tone)])
            .aligned(CaptionAlign::Center),
    )?;
    c.show(sc, seconds(time));
    Ok(c)
}
fn begin(
    id: &str,
    duration: f64,
    elements: Vec<StageElement>,
) -> Result<(PlanBuilder, StageActor)> {
    let mut sc = PlanBuilder::new(id, seconds(duration));
    let s = StageActor::declare(
        &mut sc,
        "stage",
        &StagePlan {
            post: StagePost {
                bloom: 0.32,
                grain: 0.009,
                vignette: 0.22,
                backdrop: 0.16,
            },
            elements,
        },
    )?;
    sc.cue(id, 0, seconds(duration));
    Ok((sc, s))
}
fn appear(sc: &mut PlanBuilder, s: &mut StageActor, id: &str, time: f64) {
    s.channel(sc, &format!("{id}.opacity"), 0.0);
    s.to(sc, &format!("{id}.opacity"), seconds(time), 1.0, 0.35);
}
fn orientation() -> Result<ScenePlan> {
    let (mut sc, mut s) = begin(
        "orientation",
        3.6,
        vec![ring("guide", [960.0, 535.0, 0.0], 250.0, Tone::Accent)],
    )?;
    s.channel(&mut sc, "guide.opacity", 0.035);
    for (id, text, at, size, tone, start) in [
        (
            "app",
            "ASO Audit Agent",
            [960.0, 290.0],
            28.0,
            Tone::Muted,
            0.25,
        ),
        (
            "topic",
            "How the audit works",
            [960.0, 435.0],
            76.0,
            Tone::Plain,
            0.4,
        ),
        (
            "input",
            "Start with an App Store URL or app ID.",
            [960.0, 595.0],
            34.0,
            Tone::Accent,
            0.7,
        ),
    ] {
        let mut c = CaptionActor::declare(
            &mut sc,
            id,
            &CaptionPlan::line(at, size, vec![CaptionSpanPlan::new(text, tone)])
                .aligned(CaptionAlign::Center),
        )?;
        let opacity = c.channel(&mut sc, "opacity", 0.0);
        let y = c.channel(&mut sc, "y", 12.0);
        sc.ease(&opacity, seconds(start), 1.0, 0.75, Ease::Smootherstep);
        sc.spring(&y, seconds(start), 0.0, 0.8, 0.0);
    }
    Ok(sc.finish()?)
}
fn confirmation() -> Result<ScenePlan> {
    let e = vec![
        card(
            "identity",
            [620.0, 520.0, 0.0],
            [540.0, 210.0],
            "Is this your app?",
            "App / developer / storefront",
            Tone::Request,
        ),
        ring("gate", [1310.0, 520.0, 0.0], 165.0, Tone::Accent),
        orb("signal", [1310.0, 520.0, 0.0], 60.0, Tone::Accent),
        label("pause", [1310.0, 520.0, -100.0], 60.0, "II", Tone::Plain),
        label("go", [1310.0, 520.0, -100.0], 56.0, "✓", Tone::Success),
        wire("link", "identity", "signal", Tone::Success),
        packet("ok", "link", Tone::Success),
    ];
    let (mut sc, mut s) = begin("confirmation", 7.0, e)?;
    caption(
        &mut sc,
        "title",
        "First, a checkpoint.",
        [960.0, 155.0],
        62.0,
        Tone::Plain,
        0.25,
    )?;
    s.settle_in(&mut sc, "identity", seconds(0.55));
    appear(&mut sc, &mut s, "gate", 0.8);
    appear(&mut sc, &mut s, "signal", 0.8);
    appear(&mut sc, &mut s, "pause", 0.8);
    s.channel(&mut sc, "go.opacity", 0.0);
    s.channel(&mut sc, "gate.sweep", 0.0);
    s.ease(
        &mut sc,
        "gate.sweep",
        seconds(0.8),
        1.0,
        1.5,
        Ease::CubicOut,
    );
    let mut waiting = caption(
        &mut sc,
        "waiting",
        "WAITING FOR YOU",
        [1310.0, 765.0],
        26.0,
        Tone::Accent,
        1.2,
    )?;
    caption(
        &mut sc,
        "small",
        "The audit pauses until you confirm the match.",
        [780.0, 970.0],
        26.0,
        Tone::Muted,
        1.1,
    )?;
    s.to(&mut sc, "pause.opacity", seconds(3.0), 0.0, 0.2);
    s.to(&mut sc, "go.opacity", seconds(3.2), 1.0, 0.25);
    waiting.hide(&mut sc, seconds(3.0));
    caption(
        &mut sc,
        "confirmed",
        "CONFIRMED",
        [1310.0, 765.0],
        28.0,
        Tone::Success,
        3.25,
    )?;
    s.connect(&mut sc, "link", seconds(3.1), 0.5);
    s.send(&mut sc, "ok", seconds(4.0), 0.75);
    s.hit(&mut sc, "signal.pulse", seconds(4.75), 1.0, 0.0);
    s.to(&mut sc, "gate.expand", seconds(4.75), 0.15, 1.0);
    Ok(sc.finish()?)
}
fn evidence() -> Result<ScenePlan> {
    let mut e = vec![
        orb("core", [960.0, 510.0, 0.0], 115.0, Tone::Accent),
        ring("scan", [960.0, 510.0, 0.0], 170.0, Tone::Accent),
    ];
    for (id, at, title, detail, tone) in [
        (
            "metadata",
            [420.0, 350.0, 0.0],
            "Metadata",
            "Title / subtitle / description",
            Tone::Request,
        ),
        (
            "assets",
            [1500.0, 350.0, 0.0],
            "Visuals",
            "Screenshots / icon / preview",
            Tone::Success,
        ),
        (
            "reviews",
            [420.0, 715.0, 0.0],
            "Reviews",
            "Sampled user feedback",
            Tone::Warning,
        ),
        (
            "related",
            [1500.0, 715.0, 0.0],
            "Related apps",
            "Public comparison candidates",
            Tone::Accent,
        ),
    ] {
        e.push(card(id, at, [380.0, 135.0], title, detail, tone));
        e.push(wire(&format!("w-{id}"), id, "core", tone));
        e.push(packet(&format!("p-{id}"), &format!("w-{id}"), tone));
    }
    let (mut sc, mut s) = begin("evidence", 8.0, e)?;
    caption(
        &mut sc,
        "title",
        "Gather the signals.",
        [960.0, 130.0],
        64.0,
        Tone::Plain,
        0.2,
    )?;
    appear(&mut sc, &mut s, "core", 0.3);
    appear(&mut sc, &mut s, "scan", 0.4);
    s.channel(&mut sc, "scan.sweep", 0.0);
    s.ease(
        &mut sc,
        "scan.sweep",
        seconds(0.5),
        1.0,
        1.5,
        Ease::Smootherstep,
    );
    s.channel(&mut sc, "core.rotation", -1.0);
    s.to(&mut sc, "core.rotation", seconds(0.3), 0.0, 1.2);
    for (i, id) in ["metadata", "assets", "reviews", "related"]
        .iter()
        .enumerate()
    {
        let t = 0.8 + i as f64 * 0.45;
        s.settle_in(&mut sc, id, seconds(t));
        s.connect(&mut sc, &format!("w-{id}"), seconds(t + 0.5), 0.5);
        let arrival = s.send(&mut sc, &format!("p-{id}"), seconds(t + 2.2), 0.7);
        s.hit(&mut sc, "core.pulse", arrival, 0.75, 0.0);
    }
    caption(
        &mut sc,
        "public",
        "PUBLIC EVIDENCE ONLY",
        [960.0, 915.0],
        28.0,
        Tone::Accent,
        2.0,
    )?;
    caption(
        &mut sc,
        "scope",
        "Listing pages + Apple data. Collection gaps stay visible.",
        [960.0, 980.0],
        23.0,
        Tone::Muted,
        2.3,
    )?;
    s.to(&mut sc, "camera.z", seconds(5.8), 90.0, 1.4);
    Ok(sc.finish()?)
}
fn parallel() -> Result<ScenePlan> {
    let mut e = vec![];
    for (i, (id, title, detail, tone)) in [
        (
            "text",
            "TEXT",
            "Title / subtitle / description",
            Tone::Request,
        ),
        (
            "visual",
            "VISUALS",
            "Screenshots / icon / preview",
            Tone::Success,
        ),
        (
            "market",
            "MARKET",
            "Reviews / related listings",
            Tone::Warning,
        ),
    ]
    .into_iter()
    .enumerate()
    {
        let y = 340.0 + i as f32 * 210.0;
        e.push(card(
            id,
            [390.0, y, 0.0],
            [360.0, 130.0],
            title,
            detail,
            tone,
        ));
        e.push(ring(&format!("end-{id}"), [1630.0, y, 0.0], 32.0, tone));
        e.push(wire(&format!("lane-{id}"), id, &format!("end-{id}"), tone));
        e.push(packet(&format!("runner-{id}"), &format!("lane-{id}"), tone));
        e.push(label(
            &format!("done-{id}"),
            [1630.0, y, 15.0],
            35.0,
            "✓",
            tone,
        ));
    }
    let (mut sc, mut s) = begin("parallel", 8.0, e)?;
    caption(
        &mut sc,
        "title",
        "One input. Three lanes.",
        [960.0, 140.0],
        66.0,
        Tone::Plain,
        0.2,
    )?;
    for (i, id) in ["text", "visual", "market"].iter().enumerate() {
        s.settle_in(&mut sc, id, seconds(0.7 + i as f64 * 0.15));
        appear(&mut sc, &mut s, &format!("end-{id}"), 1.0);
        s.connect(&mut sc, &format!("lane-{id}"), seconds(1.3), 0.65);
        s.channel(&mut sc, &format!("done-{id}.opacity"), 0.0);
        let flight = [1.8, 2.6, 2.2][i];
        let arrived = s.send(&mut sc, &format!("runner-{id}"), seconds(2.5), flight);
        s.to(&mut sc, &format!("done-{id}.opacity"), arrived, 1.0, 0.2);
    }
    caption(
        &mut sc,
        "explain",
        "Parallel scoring brings the evidence together.",
        [960.0, 950.0],
        28.0,
        Tone::Muted,
        1.6,
    )?;
    caption(
        &mut sc,
        "join",
        "JOIN  →  WEIGHT  →  REPORT",
        [960.0, 1020.0],
        24.0,
        Tone::Accent,
        5.3,
    )?;
    Ok(sc.finish()?)
}
fn report() -> Result<ScenePlan> {
    let mut e = vec![ring("meter", [470.0, 480.0, 0.0], 190.0, Tone::Accent)];
    for (i, (id, title, detail, tone)) in [
        (
            "quick",
            "01  Quick wins",
            "Small, practical edits",
            Tone::Success,
        ),
        (
            "impact",
            "02  High-impact changes",
            "Evidence-backed priorities",
            Tone::Request,
        ),
        (
            "strategy",
            "03  Strategic next steps",
            "Supported before / after",
            Tone::Accent,
        ),
    ]
    .into_iter()
    .enumerate()
    {
        e.push(card(
            id,
            [1310.0, 355.0 + i as f32 * 190.0, 0.0],
            [590.0, 145.0],
            title,
            detail,
            tone,
        ));
    }
    let (mut sc, mut s) = begin("report", 8.0, e)?;
    caption(
        &mut sc,
        "title",
        "Scores become recommendations.",
        [960.0, 125.0],
        66.0,
        Tone::Plain,
        0.2,
    )?;
    appear(&mut sc, &mut s, "meter", 0.4);
    s.channel(&mut sc, "meter.sweep", 0.0);
    s.ease(
        &mut sc,
        "meter.sweep",
        seconds(0.8),
        0.78,
        2.2,
        Ease::CubicOut,
    );
    let mut number = RollingNumberActor::declare(
        &mut sc,
        "score",
        RollingNumberPlan::new([470.0, 450.0], 110.0, "00")
            .aligned(CaptionAlign::Center)
            .bold()
            .tone(Tone::Accent),
    )?;
    number.show(&mut sc, seconds(0.6));
    number.roll(&mut sc, seconds(1.1), "24")?;
    number.roll(&mut sc, seconds(1.7), "56")?;
    number.roll(&mut sc, seconds(2.3), "78")?;
    caption(
        &mut sc,
        "denominator",
        "/ 100",
        [470.0, 555.0],
        32.0,
        Tone::Muted,
        0.7,
    )?;
    caption(
        &mut sc,
        "example",
        "ILLUSTRATIVE SCORE",
        [470.0, 745.0],
        20.0,
        Tone::Muted,
        0.8,
    )?;
    caption(
        &mut sc,
        "weights",
        "9 factors. Fixed weights in code.",
        [470.0, 825.0],
        24.0,
        Tone::Plain,
        1.4,
    )?;
    for (i, id) in ["quick", "impact", "strategy"].iter().enumerate() {
        let t = 2.0 + i as f64 * 0.65;
        s.settle_in(&mut sc, id, seconds(t));
        s.channel(&mut sc, &format!("{id}.x"), 120.0);
        s.to(&mut sc, &format!("{id}.x"), seconds(t), 0.0, 0.65);
    }
    caption(
        &mut sc,
        "limit",
        "Listing-quality heuristics, with evidence and limitations.",
        [960.0, 980.0],
        25.0,
        Tone::Muted,
        4.4,
    )?;
    Ok(sc.finish()?)
}
fn outro() -> Result<ScenePlan> {
    let (mut sc, mut s) = begin(
        "outro",
        6.0,
        vec![
            card(
                "follow-up",
                [610.0, 510.0, 0.0],
                [520.0, 180.0],
                "Follow-up questions",
                "Discuss the recommendations",
                Tone::Request,
            ),
            card(
                "history",
                [1310.0, 660.0, 0.0],
                [520.0, 180.0],
                "Saved audit history",
                "Return in the same browser",
                Tone::Success,
            ),
            wire("context", "follow-up", "history", Tone::Accent),
            packet("thread", "context", Tone::Accent),
        ],
    )?;
    caption(
        &mut sc,
        "title",
        "The audit stays in the conversation.",
        [960.0, 180.0],
        54.0,
        Tone::Plain,
        0.25,
    )?;
    s.settle_in(&mut sc, "follow-up", seconds(0.7));
    s.settle_in(&mut sc, "history", seconds(1.6));
    s.connect(&mut sc, "context", seconds(2.0), 0.6);
    s.send(&mut sc, "thread", seconds(3.0), 0.8);
    caption(
        &mut sc,
        "persistence",
        "Conversation history and workflow state are persisted.",
        [960.0, 925.0],
        26.0,
        Tone::Muted,
        2.5,
    )?;
    Ok(sc.finish()?)
}
fn main() -> Result<()> {
    let mut reel = ReelPlan::dipped(
        "aso-audit-explainer-v4",
        vec![
            orientation()?,
            confirmation()?,
            evidence()?,
            parallel()?,
            report()?,
            outro()?,
        ],
        seconds(0.45),
    )?;
    reel.segments[2].transition_style = ReelTransitionStyle::Zoom;
    reel.segments[2].transition_nanos = seconds(0.8);
    reel.segments[2].transition_focus = Some([1100.0, 310.0, 420.0, 420.0]);
    reel.segments[4].transition_style = ReelTransitionStyle::Crossfade;
    reel.segments[1].transition_nanos = seconds(0.7);
    reel.validate()?;
    let out = std::env::args()
        .nth(1)
        .unwrap_or_else(|| "aso-audit-explainer.reel.json".into());
    std::fs::write(out, serde_json::to_string_pretty(&reel)? + "\n")?;
    Ok(())
}
