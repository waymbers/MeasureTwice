// Pure calculation functions for the Project Bible

function parseDimension(str = '') {
  const s = String(str).toLowerCase().trim();
  const ftMatch = s.match(/([\d.]+)\s*ft/);
  const inMatch = s.match(/([\d.]+)\s*in/);
  const numMatch = s.match(/^[\d.]+$/);
  if (ftMatch) return parseFloat(ftMatch[1]) * 12;
  if (inMatch) return parseFloat(inMatch[1]);
  if (numMatch) return parseFloat(numMatch[0]);
  const num = parseFloat(s);
  return isNaN(num) ? 96 : num; // default 8 ft
}

function inchesToFt(inches) { return inches / 12; }

export function generateProjectBible(projectData) {
  const widthIn  = parseDimension(projectData.width);
  const depthIn  = parseDimension(projectData.depth);
  const heightIn = parseDimension(projectData.height);

  const widthFt  = inchesToFt(widthIn);
  const depthFt  = inchesToFt(depthIn);
  const heightFt = inchesToFt(heightIn);
  const sqFt     = widthFt * depthFt;

  const material = projectData.material || 'Pressure-treated pine';
  const isComposite = material.toLowerCase().includes('composite');
  const isCedar     = material.toLowerCase().includes('cedar');

  // ── SHOPPING LIST ──────────────────────────────────────────────
  const OVERAGE = 1.15;

  // Posts: 4x4 every 8 ft on perimeter
  const postCount = Math.ceil(2 * (widthFt + depthFt) / 8);
  // Post length includes depth in ground
  const postLengthFt = Math.ceil(heightFt + 2); // + 2 ft in ground
  const posts = {
    item: `4×4 × ${postLengthFt}' Post (${material})`,
    qty: Math.ceil(postCount * OVERAGE),
    unit: 'EA',
    unitCost: isCedar ? 22 : 14,
    category: 'Lumber',
    retailer: 'Home Depot',
    retailerUrl: 'https://www.homedepot.com',
    sku: 'HDPOST4X4',
  };

  // Beams: 2x10 doubled
  const beamLinFt = widthFt * 2; // two parallel beams
  const beamPcs   = Math.ceil((beamLinFt * OVERAGE) / 16); // 16-ft lengths
  const beams = {
    item: `2×10 × 16' Beam Lumber (${material})`,
    qty: beamPcs * 2,
    unit: 'EA',
    unitCost: isCedar ? 42 : 28,
    category: 'Lumber',
    retailer: "Lowe's",
    retailerUrl: 'https://www.lowes.com',
    sku: 'LW2X10-16',
  };

  // Joists: 2x8 @ 16" OC
  const joistSpacingFt = 16 / 12;
  const joistCount     = Math.ceil((depthFt / joistSpacingFt) + 2) * 2;
  const joistLengthFt  = Math.ceil(widthFt);
  const joistPcs       = Math.ceil(joistCount * OVERAGE);
  const joists = {
    item: `2×8 × ${joistLengthFt}' Floor Joist (${material})`,
    qty: joistPcs,
    unit: 'EA',
    unitCost: isCedar ? 28 : 18,
    category: 'Lumber',
    retailer: 'Home Depot',
    retailerUrl: 'https://www.homedepot.com',
    sku: `HD2X8-${joistLengthFt}`,
  };

  // Decking boards: 2x6
  const deckingBoardWidthFt = 5.5 / 12;
  const deckingBoardCount   = Math.ceil((depthFt / deckingBoardWidthFt) * OVERAGE);
  const deckingBoardLenFt   = Math.ceil(widthFt);
  const deckingBoards = {
    item: isComposite
      ? `Composite Deck Board 1"×6"×${deckingBoardLenFt}' (${material})`
      : `2×6 × ${deckingBoardLenFt}' Deck Board (${material})`,
    qty: deckingBoardCount,
    unit: 'EA',
    unitCost: isComposite ? 8.5 : (isCedar ? 14 : 9),
    category: 'Lumber',
    retailer: isComposite ? 'Trex.com' : 'Home Depot',
    retailerUrl: isComposite ? 'https://www.trex.com' : 'https://www.homedepot.com',
    sku: 'DECK-2X6',
  };

  // Concrete for footings
  const concreteBags = Math.ceil(postCount * 2 * OVERAGE); // 2 bags per post
  const concrete = {
    item: 'Fast-Setting Concrete (50 lb bag)',
    qty: concreteBags,
    unit: 'BAG',
    unitCost: 6.50,
    category: 'Hardware',
    retailer: "Lowe's",
    retailerUrl: 'https://www.lowes.com',
    sku: 'SAKRETE-50',
  };

  const jhangers  = { item: 'Joist Hangers (LUS28)', qty: Math.ceil(joistCount * OVERAGE), unit: 'EA', unitCost: 2.50, category: 'Hardware', retailer: 'Home Depot', retailerUrl: 'https://www.homedepot.com', sku: 'SIMPSON-LUS28' };
  const postBases = { item: 'Post Base (CB44)', qty: Math.ceil(postCount * OVERAGE), unit: 'EA', unitCost: 8, category: 'Hardware', retailer: 'Home Depot', retailerUrl: 'https://www.homedepot.com', sku: 'SIMPSON-CB44' };
  const deckScrews = { item: '#10 × 3" Deck Screws (1 lb box)', qty: Math.ceil(sqFt / 25), unit: 'BOX', unitCost: 14, category: 'Hardware', retailer: "Lowe's", retailerUrl: 'https://www.lowes.com', sku: 'SCREWS-3IN' };
  const lagScrews  = { item: '1/2" × 4" Lag Bolt (25-pk)', qty: Math.max(1, Math.ceil(postCount * 2 / 25)), unit: 'PK', unitCost: 18, category: 'Hardware', retailer: 'Home Depot', retailerUrl: 'https://www.homedepot.com', sku: 'LAG-1-2-4' };
  const hangNails  = { item: '1.5" Joist Hanger Nails (1 lb box)', qty: Math.max(1, Math.ceil(joistCount / 30)), unit: 'BOX', unitCost: 8, category: 'Hardware', retailer: "Lowe's", retailerUrl: 'https://www.lowes.com', sku: 'NAILS-1-5' };

  const waterSeal = { item: 'Waterproofing Sealer (1 gal)', qty: Math.max(1, Math.ceil(sqFt / 150 * OVERAGE)), unit: 'GAL', unitCost: 38, category: 'Specialty', retailer: 'Amazon', retailerUrl: 'https://www.amazon.com', sku: 'SEAL-1GAL' };
  const sandpaper = { item: '80-Grit Sandpaper (25-pk)', qty: 2, unit: 'PK', unitCost: 12, category: 'Specialty', retailer: 'Amazon', retailerUrl: 'https://www.amazon.com', sku: 'SAND-80-25' };
  const safetyKit = { item: 'PPE Kit (gloves, goggles, dust mask)', qty: 1, unit: 'KIT', unitCost: 24, category: 'Specialty', retailer: 'Home Depot', retailerUrl: 'https://www.homedepot.com', sku: 'PPE-KIT-1' };

  const shoppingList = [posts, beams, joists, deckingBoards, concrete, jhangers, postBases, deckScrews, lagScrews, hangNails, waterSeal, sandpaper, safetyKit];

  const lumberCost    = shoppingList.filter(i => i.category === 'Lumber').reduce((a, i) => a + i.qty * i.unitCost, 0);
  const hardwareCost  = shoppingList.filter(i => i.category === 'Hardware').reduce((a, i) => a + i.qty * i.unitCost, 0);
  const specialtyCost = shoppingList.filter(i => i.category === 'Specialty').reduce((a, i) => a + i.qty * i.unitCost, 0);
  const totalEstimate = lumberCost + hardwareCost + specialtyCost;

  const instructions = buildInstructions(projectData, { widthFt, depthFt, heightFt, sqFt, postCount, joistCount });

  return {
    projectData,
    dimensions: { widthIn, depthIn, heightIn, widthFt, depthFt, heightFt, sqFt },
    shoppingList,
    lumberCost,
    hardwareCost,
    specialtyCost,
    totalEstimate,
    instructions,
  };
}

function buildInstructions(pd, dims) {
  const { widthFt, depthFt, heightFt, postCount, joistCount } = dims;
  const postDepthIn = heightFt > 6 ? 48 : 36;
  const material    = pd.material || 'Pressure-treated pine';
  const constraints = (pd.constraints || '').toLowerCase();
  const hasSlope    = constraints.includes('slop');
  const hasTree     = constraints.includes('tree');
  const isCorner    = constraints.includes('corner');
  const isComposite = (pd.material || '').toLowerCase().includes('composite');

  return [
    {
      phase: 'Phase 1: Site Layout & Footings',
      steps: [
        {
          n: 1,
          text: `Using 3-4-5 triangulation, stake the four corners of the ${widthFt.toFixed(1)}' × ${depthFt.toFixed(1)}' footprint. Run batter boards 2 ft beyond each corner. Verify square: diagonal measurements MUST match within 1/4".`,
          type: 'normal',
        },
        {
          n: 2,
          text: hasSlope
            ? `SLOPED SITE: Set your reference stake at the highest point. Using a line level or laser level, establish top-of-post elevation across all ${postCount} posts. Mark cut heights on each post after setting — cut level in situ.`
            : `Mark all ${postCount} post hole centers with marking paint. Double-check spacing: posts should be no more than 8 ft O.C. Maximum footing depth from grade per post: confirm local frost line depth.`,
          type: 'normal',
        },
        {
          n: 3,
          text: `⚠ FOREMAN'S WARNING: Post holes MUST reach below the local frost line — minimum ${postDepthIn}" depth in most northern climates. Confirm with your local building department. A footing above the frost line WILL heave and compromise the entire structure. This is non-negotiable.`,
          type: 'warning',
        },
        {
          n: 4,
          text: `Dig post holes with a power auger (available for rent at Home Depot / Lowe's). Diameter: minimum 10" for 4×4 posts, 12" for 6×6. Add 6" of compacted gravel at the bottom of each hole for drainage before pouring concrete.`,
          type: 'normal',
        },
        {
          n: 5,
          text: `Set post base hardware (Simpson CB44) in wet concrete. Verify each base is level and at correct XY position using your batter board strings. Allow concrete to cure 24–48 hours minimum before loading posts.`,
          type: 'normal',
        },
        {
          n: 6,
          text: `⚠ FOREMAN'S WARNING: Never pour concrete dry-in-hole for load-bearing posts in high-moisture soils. Always mix per manufacturer specs. Under-loaded footing = structural failure. Add 2 bags of fast-setting concrete per post.`,
          type: 'warning',
        },
      ],
    },
    {
      phase: 'Phase 2: Post & Beam Framing (Yoke Assembly)',
      steps: [
        {
          n: 7,
          text: `Set posts in post bases. Brace each post plumb in both directions using 2×4 kicker braces staked to ground. Do NOT remove braces until beam and all joists are fully fastened and secured.`,
          type: 'normal',
        },
        {
          n: 8,
          text: hasTree
            ? `TREE CONSTRAINT DETECTED: Leave minimum 6" clearance between framing and tree trunk. Root zone extends 12" for every 1" of trunk diameter — do not cut roots > 2" diameter. Consider floating header to bridge root zone.`
            : `Mark beam height on all posts using a laser level. Beam bottom elevation: ${heightFt.toFixed(2)}' from finished grade. Snap chalk line and mark all posts simultaneously for consistency.`,
          type: 'normal',
        },
        {
          n: 9,
          text: `⚠ FOREMAN'S WARNING: Two-person lift minimum for beams over 12 ft. Use beam jacks or scaffolding — DO NOT hold a beam in place while fastening solo. Dropped beams cause crush injuries. No exceptions.`,
          type: 'warning',
        },
        {
          n: 10,
          text: `Install doubled ${material} 2×10 beam: toenail each ply with 3" structural screws at 12" O.C., then add 1/2" × 4" lag bolts through posts at every third joist location. ⭐ PRO TIP: Crown of beam faces UP — this is the natural bow in the wood and will counteract deflection under load.`,
          type: 'normal',
        },
        {
          n: 11,
          text: `Install rim joists (band boards) first — these define your perimeter. Secure to beam top with post hangers or structural screws at 45°. Check for level across full span before any interior framing begins.`,
          type: 'normal',
        },
        {
          n: 12,
          text: `Install interior joists at 16" O.C. using Simpson LUS28 joist hangers. All hanger nails must be driven full — zero partial nails allowed. Install blocking at mid-span for any joist over 8 ft. You'll need approx. ${joistCount} joist pieces. Blocking = critical for lateral stability.`,
          type: 'normal',
        },
      ],
    },
    {
      phase: 'Phase 3: Decking Installation',
      steps: [
        {
          n: 13,
          text: `Before decking, apply a full coat of end-grain sealer to all cut joist ends. This is your #1 defense against rot. Allow to dry per label — typically 30–60 min. Skipping this step voids most lumber warranties.`,
          type: 'normal',
        },
        {
          n: 14,
          text: `Start first deck board flush or overhanging rim joist by 1" for drainage. Use a string line to keep courses straight. Check alignment every 4–5 boards and adjust gap (1/8" standard for wood, per manufacturer spec for composite).`,
          type: 'normal',
        },
        {
          n: 15,
          text: `⚠ FOREMAN'S WARNING: Pre-drill all deck boards within 3" of ends to prevent splitting. Use #10 × 3" coated deck screws — two per board per joist crossing. NEVER use drywall or interior screws outdoors. They will rust and fail within 2 seasons.`,
          type: 'warning',
        },
        {
          n: 16,
          text: isComposite
            ? `Composite decking requires hidden fastener clips (verify manufacturer spec — Trex, Fiberon, etc. differ). Leave 1/4" gap between boards for airflow. ⭐ PRO TIP: Composite expands up to 3/8" in summer heat — install at average ambient temperature, not during peak summer heat.`
            : `${material} will shrink as it dries. For green (wet) lumber: install boards tight and let gaps develop naturally. For kiln-dried: maintain 1/8" gap using a 16d nail as a spacing jig.`,
          type: 'normal',
        },
        {
          n: 17,
          text: `Snap chalk line along house side and outside edge. Use circular saw with edge guide to trim all boards to consistent 1" overhang. Set blade depth to cut boards only — not joists below. ⭐ PRO TIP: A 1" overhang protects rim joist from direct rainfall.`,
          type: 'normal',
        },
        {
          n: 18,
          text: `⚠ FOREMAN'S WARNING: Circular saw kickback injuries are among the most common on residential job sites. Let saw reach full speed before entering cut. Never reach over a spinning blade. Always use a rip guide or clamped straightedge for long cuts over 4 ft.`,
          type: 'warning',
        },
      ],
    },
    {
      phase: 'Phase 4: Railing, Stairs & Finishing',
      steps: [
        {
          n: 19,
          text: isCorner
            ? `CORNER INSTALLATION: Install a double post at the interior corner for railing attachment. Miter rail returns at 45° for clean corner geometry. ⭐ PRO TIP FOR OCTAGONS / CORNERS: Cut angle = 22.5° for octagonal returns. Use a compound miter saw set at 22.5°.`
            : `Install railing posts (4×4 minimum) at corners and no more than 72" O.C. Bolt through rim joist with two 1/2" through-bolts per post — DO NOT toenail only. This is both a code requirement and a safety imperative.`,
          type: 'normal',
        },
        {
          n: 20,
          text: `Top rail height: 36" minimum for decks < 30" above grade; 42" minimum for decks ≥ 30" above grade. Baluster spacing must NOT allow a 4" sphere to pass through — this is child safety code IRC R312.1.3. Use a 4" PVC pipe as a go/no-go gauge.`,
          type: 'normal',
        },
        {
          n: 21,
          text: `⚠ FOREMAN'S WARNING: Railing is a life-safety element. A wobbling post is a failing post. Apply 200 lbs lateral force to each post during inspection. Deflection > 1" = NOT code-compliant. Rebuild the connection before proceeding.`,
          type: 'warning',
        },
        {
          n: 22,
          text: `Stairs: rise must be between 4" and 7.75"; tread run minimum 10". All risers in one flight must be within 3/8" of each other. ⭐ PRO TIP: A 6" rise × 10" run (6-10 rule) is a comfortable, ADA-friendly stair ratio for residential decks.`,
          type: 'normal',
        },
        {
          n: 23,
          text: `Sand all exposed surfaces with 80-grit to remove mill glaze and splinters. Apply penetrating waterproofing sealer within 48 hours of completion — wipe-on / wipe-off method. Apply second coat same day while first is still slightly tacky for maximum adhesion and penetration.`,
          type: 'normal',
        },
        {
          n: 24,
          text: `⚠ FOREMAN'S WARNING — FINAL INSPECTION CHECKLIST: ✓ All posts plumb ±1/4" | ✓ Deck sloped away from house at 1/8" per foot | ✓ All joist hangers fully nailed | ✓ Railing posts solid (200-lb test) | ✓ No screw heads raised above deck surface | ✓ Building permit sticker posted (if required). MEASURE TWICE — SIGN OFF ONCE.`,
          type: 'warning',
        },
      ],
    },
  ];
}
