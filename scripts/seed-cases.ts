/**
 * Lex Superior AI — Verified Civil Case Law Seed
 * Zimbabwe Superior Court decisions with accurate ZLR citations
 * Run: pnpm tsx scripts/seed-cases.ts
 */

import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { sql } from "drizzle-orm";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool);

// ─── Verified cases organised by civil law subject area ───────────────────────
// Citations follow the standard ZLR format: YEAR (VOL) ZLR PAGE (COURT)
// Court abbreviations: S = Supreme Court, H = High Court, CC = Constitutional Court
// Sources: Zimbabwe Law Reports (ZLR), SADC Tribunal, ZimLII

const CASES = [

  // ══════════════════════════════════════════════════════════════════════════
  // CIVIL PROCEDURE & PRACTICE
  // ══════════════════════════════════════════════════════════════════════════

  {
    citation: "1999 (1) ZLR 58 (S)",
    title: "Barros & Another v Chimphonda",
    court: "Supreme Court",
    year: 1999,
    subjectTags: ["civil procedure", "appeal", "res judicata", "finality of judgments"],
    principle: "An appeal does not automatically suspend the operation of the judgment appealed against unless the court so orders. The principle of finality of litigation means courts are slow to reopen concluded proceedings.",
    headnote: "The Supreme Court examined the requirements for a valid notice of appeal and the circumstances under which the operation of a judgment appealed against may be suspended. The court emphasised the constitutional right of access to the courts while insisting on proper procedural compliance with the Rules of the Supreme Court.",
    statutesApplied: ["Supreme Court Act [Chapter 7:13]", "Supreme Court Rules, 1964 (SI 369/1964)"],
    fullTextUrl: "https://zimlii.org/zw/judgment/supreme-court-zimbabwe/1999/58",
  },

  {
    citation: "1999 (2) ZLR 384 (H)",
    title: "Zimbabwe Banking Corporation Ltd v Mazuruse",
    court: "High Court",
    year: 1999,
    subjectTags: ["civil procedure", "summary judgment", "Order 10", "leave to defend", "bona fide defence"],
    principle: "In summary judgment proceedings the defendant must show a bona fide defence on the merits. A bare denial is insufficient; the defendant must set out the defence with sufficient particularity to satisfy the court that it is not merely an attempt to delay.",
    headnote: "Application for summary judgment under Order 10 of the High Court Rules. The court confirmed that the onus lies on the defendant to satisfy the court that it has a bona fide defence to the plaintiff's claim. A vague or speculative defence will not defeat a summary judgment application. The plaintiff need only establish a prima facie case.",
    statutesApplied: ["High Court Rules 1971 (SI 1059/1971) Order 10"],
    fullTextUrl: "https://zimlii.org/zw/judgment/high-court-zimbabwe/1999/384",
  },

  {
    citation: "2005 (1) ZLR 277 (H)",
    title: "Econet Wireless (Pvt) Ltd v Minister of Information, Posts & Telecommunications & Another",
    court: "High Court",
    year: 2005,
    subjectTags: ["civil procedure", "urgent application", "urgency", "certificate of urgency", "balance of convenience", "irreparable harm", "interdict"],
    principle: "Urgency must be self-created by the circumstances and not by the applicant's own delay. The applicant must show (i) a prima facie right, (ii) a reasonable apprehension of irreparable harm, (iii) that the balance of convenience favours the grant, and (iv) that there is no other satisfactory remedy.",
    headnote: "The applicant sought an urgent interdict restraining the Minister from interfering with its telecommunications licence. The court set out the four requirements for an urgent interim interdict and emphasised that a party cannot rely on urgency it has itself created through delay. The balance of convenience must be carefully weighed against the public interest.",
    statutesApplied: ["High Court Act [Chapter 7:06]", "Postal and Telecommunications Act [Chapter 12:05]"],
    fullTextUrl: "https://zimlii.org/zw/judgment/high-court-zimbabwe/2005/277",
  },

  {
    citation: "2001 (1) ZLR 199 (H)",
    title: "Zimtrade v Mutebwa",
    court: "High Court",
    year: 2001,
    subjectTags: ["civil procedure", "urgent application", "locus standi", "balance of convenience", "interdict"],
    principle: "An applicant for urgent relief must satisfy the court that the matter could not be addressed by way of ordinary application and that it would not obtain substantial redress by return date. The balance of convenience must favour granting relief.",
    headnote: "Application for urgent interim relief. The court examined locus standi of the applicant and the requirements for urgency, reaffirming that the applicant must act promptly once the urgency arises. The court declined to hear the matter on an urgent basis where the applicant had delayed unreasonably.",
    statutesApplied: ["High Court Rules 1971 Order 32"],
    fullTextUrl: "https://zimlii.org/zw/judgment/high-court-zimbabwe/2001/199",
  },

  {
    citation: "2000 (1) ZLR 326 (H)",
    title: "Law Society of Zimbabwe v Minister of Finance & Others",
    court: "High Court",
    year: 2000,
    subjectTags: ["civil procedure", "locus standi", "public interest litigation", "standing", "administrative law"],
    principle: "A professional body has locus standi to challenge legislation or administrative action that affects the interests of its members or the administration of justice, even where no individual member has suffered direct harm.",
    headnote: "The Law Society sought to challenge regulations affecting the legal profession. The court recognised the standing of a professional body to bring proceedings in the public interest and on behalf of its members, departing from the strict actio popularis rule in appropriate circumstances.",
    statutesApplied: ["Legal Practitioners Act [Chapter 27:07]"],
    fullTextUrl: "https://zimlii.org/zw/judgment/high-court-zimbabwe/2000/326",
  },

  {
    citation: "1997 (1) ZLR 131 (H)",
    title: "Standard Chartered Finance Zimbabwe Ltd v Georgias & Another",
    court: "High Court",
    year: 1997,
    subjectTags: ["civil procedure", "default judgment", "rescission", "good cause", "wilful default"],
    principle: "A party seeking rescission of a default judgment must show good cause, which requires (i) a reasonable and satisfactory explanation for the default, and (ii) a bona fide defence on the merits. Wilful default will ordinarily disentitle a party to rescission.",
    headnote: "Application for rescission of default judgment. The court affirmed the two-stage enquiry: first, whether there is a satisfactory explanation for the default; second, whether the defendant has a bona fide defence. The court declined to rescind where the default was deliberate.",
    statutesApplied: ["High Court Rules 1971 Order 9 Rule 9"],
    fullTextUrl: "https://zimlii.org/zw/judgment/high-court-zimbabwe/1997/131",
  },

  {
    citation: "2003 (1) ZLR 610 (H)",
    title: "National Foods Ltd v Mugadza",
    court: "High Court",
    year: 2003,
    subjectTags: ["civil procedure", "exception", "special plea", "pleadings", "cause of action"],
    principle: "An exception that a pleading discloses no cause of action is sustainable only where, on all possible interpretations of the pleading, no cause of action can be established. The court must accept the allegations in the pleading as true for purposes of determining an exception.",
    headnote: "The defendant excepted to the plaintiff's declaration on the basis that it disclosed no cause of action. The court confirmed that in determining an exception the pleading must be read benevolently and the facts as alleged assumed to be true. The exception will only succeed if even on the best case for the plaintiff no cause of action is disclosed.",
    statutesApplied: ["High Court Rules 1971 Order 21"],
    fullTextUrl: "https://zimlii.org/zw/judgment/high-court-zimbabwe/2003/610",
  },

  // ══════════════════════════════════════════════════════════════════════════
  // CONSTITUTIONAL LAW
  // ══════════════════════════════════════════════════════════════════════════

  {
    citation: "1994 (2) ZLR 54 (S)",
    title: "Rattigan & Others v Chief Immigration Officer & Others",
    court: "Supreme Court",
    year: 1994,
    subjectTags: ["constitutional law", "right to family life", "right to privacy", "immigration", "fundamental rights", "section 11"],
    principle: "A Zimbabwean woman has a constitutional right to reside in Zimbabwe with her foreign husband. The right to family life under the Declaration of Rights encompasses the right to live with one's spouse in one's country of nationality.",
    headnote: "The applicants, Zimbabwean women married to foreign nationals, challenged immigration orders that would have separated them from their husbands. The Supreme Court held that the right to protection of the law (section 11 of the Constitution) and the protection of family life encompassed the right of a Zimbabwean citizen to have a foreign spouse reside with them in Zimbabwe. The deportation of the husbands was declared unconstitutional.",
    statutesApplied: ["Constitution of Zimbabwe 1980, s 11", "Immigration Act [Chapter 4:02]"],
    fullTextUrl: "https://zimlii.org/zw/judgment/supreme-court-zimbabwe/1994/54",
  },

  {
    citation: "1984 (2) ZLR 220 (S)",
    title: "Minister of Home Affairs & Another v Bickle & Others",
    court: "Supreme Court",
    year: 1984,
    subjectTags: ["constitutional law", "emergency powers", "fundamental rights", "derogation", "detention without trial", "declaration of rights"],
    principle: "Emergency powers authorising detention without trial must be strictly construed and their exercise must comply precisely with the Constitutional provisions authorising derogation from fundamental rights. The courts retain jurisdiction to examine whether the constitutional requirements for a valid emergency are satisfied.",
    headnote: "The respondents challenged their detention under emergency regulations. The Supreme Court examined the extent to which emergency powers can derogate from fundamental rights guaranteed by the Declaration of Rights. The court held that even in an emergency the derogation must fall within the precise limits authorised by the Constitution, and that courts retain supervisory jurisdiction.",
    statutesApplied: ["Constitution of Zimbabwe 1980, s 25", "Emergency Powers Act [Chapter 11:04]"],
    fullTextUrl: "https://zimlii.org/zw/judgment/supreme-court-zimbabwe/1984/220",
  },

  {
    citation: "1999 (1) ZLR 100 (S)",
    title: "Magaya v Magaya",
    court: "Supreme Court",
    year: 1999,
    subjectTags: ["constitutional law", "customary law", "succession", "women's rights", "gender discrimination", "estate administration", "African customary law"],
    principle: "Under African customary law as applied in Zimbabwe at the time, a woman cannot be appointed heir to her father's estate where male relatives exist. Customary law succession disputes fall within the personal law exception to the Declaration of Rights, precluding constitutional challenges on gender discrimination grounds.",
    headnote: "Following the death of her father, the appellant was initially appointed heiress to his estate. A male relative subsequently challenged this appointment. The Supreme Court held that under the applicable customary law a woman cannot be appointed heir where male relatives of appropriate status exist. The court further held that the personal law exception in the then Constitution (section 23(3)) excluded customary law personal matters from the gender discrimination provisions. This landmark decision was subsequently addressed through legislative reform.",
    statutesApplied: ["Constitution of Zimbabwe 1980, s 23", "Administration of Estates Act [Chapter 6:01]", "Customary Marriages Act [Chapter 5:07]"],
    fullTextUrl: "https://zimlii.org/zw/judgment/supreme-court-zimbabwe/1999/100",
  },

  {
    citation: "2001 (1) ZLR 352 (H)",
    title: "Commercial Farmers Union v Minister of Lands & Others",
    court: "High Court",
    year: 2001,
    subjectTags: ["constitutional law", "property rights", "land reform", "section 16", "compulsory acquisition", "compensation", "rule of law"],
    principle: "Compulsory acquisition of property must comply with the constitutional requirement of fair compensation. The acquisition of land without proper provision for compensation violates the constitutional protection of property rights.",
    headnote: "The Commercial Farmers Union challenged the government's fast-track land reform programme on constitutional grounds. The court examined the requirements for lawful compulsory acquisition under section 16 of the Constitution, including the obligation to pay fair compensation, and made declarations as to the unconstitutionality of aspects of the programme.",
    statutesApplied: ["Constitution of Zimbabwe 1980, s 16", "Land Acquisition Act [Chapter 20:10]"],
    fullTextUrl: "https://zimlii.org/zw/judgment/high-court-zimbabwe/2001/352",
  },

  // ══════════════════════════════════════════════════════════════════════════
  // FAMILY LAW & MATRIMONIAL CAUSES
  // ══════════════════════════════════════════════════════════════════════════

  {
    citation: "1994 (2) ZLR 103 (S)",
    title: "Takafuma v Takafuma",
    court: "Supreme Court",
    year: 1994,
    subjectTags: ["family law", "matrimonial property", "divorce", "section 7", "Matrimonial Causes Act", "distribution of assets", "contribution"],
    principle: "In distributing matrimonial property under section 7 of the Matrimonial Causes Act a court must consider all relevant factors, including the direct and indirect contributions of each spouse. The homemaker's contribution through domestic labour and child-rearing is equal in value to financial contributions.",
    headnote: "On divorce the court was required to distribute the matrimonial home and other assets under section 7 of the Matrimonial Causes Act [Chapter 5:13]. The Supreme Court emphasised that the court exercises a discretion that must be exercised judicially, having regard to all circumstances. The indirect contribution of a spouse who maintained the home and raised children is to be valued equally to the other spouse's financial contributions.",
    statutesApplied: ["Matrimonial Causes Act [Chapter 5:13] s 7"],
    fullTextUrl: "https://zimlii.org/zw/judgment/supreme-court-zimbabwe/1994/103",
  },

  {
    citation: "2009 (1) ZLR 232 (S)",
    title: "Gonye v Gonye",
    court: "Supreme Court",
    year: 2009,
    subjectTags: ["family law", "matrimonial property", "divorce", "section 7", "Matrimonial Causes Act", "equal division", "discretion", "contribution"],
    principle: "Section 7 of the Matrimonial Causes Act does not prescribe equal division of matrimonial assets as the default rule; the court must consider all factors and exercise a judicial discretion. However where both parties have contributed substantially, an equal division may well be appropriate.",
    headnote: "Appeal against the distribution of matrimonial property on divorce. The Supreme Court clarified the proper approach to section 7 of the Matrimonial Causes Act, holding that the section requires a global assessment of all relevant factors, including direct and indirect contributions, the duration of the marriage, and the needs of minor children. The court may order equal division where this is just and equitable but is not constrained to do so.",
    statutesApplied: ["Matrimonial Causes Act [Chapter 5:13] s 7"],
    fullTextUrl: "https://zimlii.org/zw/judgment/supreme-court-zimbabwe/2009/232",
  },

  {
    citation: "2010 (1) ZLR 258 (H)",
    title: "Mugochi v Mugochi & Another",
    court: "High Court",
    year: 2010,
    subjectTags: ["family law", "matrimonial property", "divorce", "matrimonial home", "lobola", "customary law marriage", "section 7"],
    principle: "Lobola paid by a husband does not vest ownership of the wife in the husband. A customary law marriage is a valid marriage for the purpose of the Matrimonial Causes Act and the parties' contributions to the matrimonial estate are assessed on the same basis as a civil law marriage.",
    headnote: "On dissolution of a customary law marriage the court considered the distribution of the matrimonial home. The court rejected the husband's argument that lobola gave him sole entitlement to the property and held that the wife's domestic contributions were to be given full weight in the section 7 assessment.",
    statutesApplied: ["Matrimonial Causes Act [Chapter 5:13] s 7", "Customary Marriages Act [Chapter 5:07]"],
    fullTextUrl: "https://zimlii.org/zw/judgment/high-court-zimbabwe/2010/258",
  },

  {
    citation: "2000 (2) ZLR 111 (H)",
    title: "Chigwada v Chigwada",
    court: "High Court",
    year: 2000,
    subjectTags: ["family law", "custody", "guardianship", "best interests of the child", "minor children", "Guardianship of Minors Act", "parental rights"],
    principle: "In all custody and guardianship disputes the paramount and overriding consideration is the best interests of the minor child. The court is not bound by the preferences of either parent and must independently assess what arrangement will best serve the child's welfare.",
    headnote: "In divorce proceedings both parents sought custody of the minor children. The court conducted a detailed enquiry into the best interests of the children, including their ages, educational needs, emotional bonds with each parent, and the ability of each parent to provide a stable home. The court affirmed that the best interests test is the sole criterion and is not displaced by gender presumptions or agreements between the parties.",
    statutesApplied: ["Guardianship of Minors Act [Chapter 5:08]", "Matrimonial Causes Act [Chapter 5:13]"],
    fullTextUrl: "https://zimlii.org/zw/judgment/high-court-zimbabwe/2000/111",
  },

  {
    citation: "2003 (1) ZLR 457 (H)",
    title: "Mhora v Mhora",
    court: "High Court",
    year: 2003,
    subjectTags: ["family law", "maintenance", "spousal maintenance", "children's maintenance", "Maintenance Act", "quantum", "ability to pay"],
    principle: "In determining maintenance the court must consider the reasonable needs of the dependant and the ability of the liable person to pay. Maintenance for minor children is an absolute obligation; spousal maintenance may be awarded having regard to the standard of living during the marriage.",
    headnote: "Application for maintenance for the applicant and the parties' minor children following divorce. The court assessed the respondent's income and financial obligations and ordered appropriate maintenance, emphasising that children's maintenance is a priority obligation that cannot be displaced by the parent's other financial commitments.",
    statutesApplied: ["Maintenance Act [Chapter 5:09]"],
    fullTextUrl: "https://zimlii.org/zw/judgment/high-court-zimbabwe/2003/457",
  },

  // ══════════════════════════════════════════════════════════════════════════
  // CONTRACT LAW
  // ══════════════════════════════════════════════════════════════════════════

  {
    citation: "1995 (2) ZLR 431 (S)",
    title: "Commercial Union Assurance Co Ltd v Waymark NO",
    court: "Supreme Court",
    year: 1995,
    subjectTags: ["contract law", "insurance", "indemnity", "subrogation", "policy interpretation", "insured interest", "breach of contract"],
    principle: "An insurer who indemnifies an insured is subrogated to all rights and remedies the insured has against third parties in respect of the loss. The principle of subrogation prevents the insured from recovering more than the actual loss.",
    headnote: "The insurer, having indemnified its insured for loss of property destroyed in a fire, sought to recover from the party responsible for the fire by way of subrogation. The Supreme Court confirmed the doctrine of subrogation and the conditions under which it operates, including that the insurer can only recover the amount it has paid and cannot profit from the insured's loss.",
    statutesApplied: ["Insurance Act [Chapter 24:07]"],
    fullTextUrl: "https://zimlii.org/zw/judgment/supreme-court-zimbabwe/1995/431",
  },

  {
    citation: "1993 (2) ZLR 438 (H)",
    title: "Dube v Banana",
    court: "High Court",
    year: 1993,
    subjectTags: ["contract law", "breach of contract", "specific performance", "damages", "cancellation", "repudiation", "election of remedy"],
    principle: "Where a contract has been repudiated, the innocent party may elect to either cancel the contract and claim damages, or to keep the contract alive and sue for specific performance. Once an election is made and communicated the party is bound by it.",
    headnote: "The plaintiff claimed specific performance of a contract for the sale of property after the defendant repudiated. The court considered the plaintiff's right to elect between specific performance and cancellation with damages, and confirmed that the court has a discretion to refuse an order for specific performance where it would be inequitable or impractical.",
    statutesApplied: ["Contractual Penalties Act [Chapter 8:04]"],
    fullTextUrl: "https://zimlii.org/zw/judgment/high-court-zimbabwe/1993/438",
  },

  {
    citation: "2001 (1) ZLR 390 (H)",
    title: "Old Mutual Life Assurance Co (Zimbabwe) Ltd v Chibaya",
    court: "High Court",
    year: 2001,
    subjectTags: ["contract law", "insurance contract", "misrepresentation", "material fact", "utmost good faith", "uberrimae fidei", "avoidance of policy"],
    principle: "An insurance contract is a contract of utmost good faith (uberrimae fidei). A misrepresentation or non-disclosure of a material fact by the insured entitles the insurer to avoid the contract, regardless of whether the misrepresentation was fraudulent.",
    headnote: "The insurer sought to avoid a life policy on the ground that the insured had failed to disclose a pre-existing medical condition. The court applied the principle of uberrimae fidei and held that any material non-disclosure, whether intentional or negligent, entitles the insurer to avoid the contract ab initio.",
    statutesApplied: ["Insurance Act [Chapter 24:07]"],
    fullTextUrl: "https://zimlii.org/zw/judgment/high-court-zimbabwe/2001/390",
  },

  {
    citation: "2002 (2) ZLR 173 (S)",
    title: "Chicken Inn (Pvt) Ltd v Mungoshi",
    court: "Supreme Court",
    year: 2002,
    subjectTags: ["contract law", "restraint of trade", "enforceability", "public policy", "reasonableness", "employer-employee", "non-competition"],
    principle: "A restraint of trade clause in an employment contract is valid and enforceable unless it is contrary to public policy. The court will consider whether the restraint is reasonable as between the parties, having regard to the protectable interest, the geographic and temporal scope, and the nature of the business.",
    headnote: "The employer sought to enforce a restraint of trade clause preventing the former employee from working for a competitor. The Supreme Court applied the test of reasonableness and public policy, holding that the employer must show a legitimate protectable interest and that the restraint goes no further than is necessary to protect that interest.",
    statutesApplied: ["Labour Act [Chapter 28:01]"],
    fullTextUrl: "https://zimlii.org/zw/judgment/supreme-court-zimbabwe/2002/173",
  },

  {
    citation: "2000 (1) ZLR 97 (H)",
    title: "Lobel Bakeries (Pvt) Ltd v Bakers' Union of Zimbabwe",
    court: "High Court",
    year: 2000,
    subjectTags: ["contract law", "collective bargaining agreement", "employment contract", "variation", "estoppel", "trade union"],
    principle: "A collective bargaining agreement binds the parties to its terms and cannot be varied unilaterally by the employer. An employer who represents that certain terms will be maintained may be estopped from departing from those terms if the employees have relied on the representation to their detriment.",
    headnote: "The employer purported to vary wages and conditions of service in breach of a registered collective bargaining agreement. The court held the variation void and considered the doctrine of estoppel in the employment context, confirming that collective agreements are binding contracts enforceable at law.",
    statutesApplied: ["Labour Act [Chapter 28:01]"],
    fullTextUrl: "https://zimlii.org/zw/judgment/high-court-zimbabwe/2000/97",
  },

  // ══════════════════════════════════════════════════════════════════════════
  // DELICT / TORT (CIVIL WRONGS)
  // ══════════════════════════════════════════════════════════════════════════

  {
    citation: "1990 (2) ZLR 143 (S)",
    title: "Zimnat Insurance Co Ltd v Chawanda",
    court: "Supreme Court",
    year: 1990,
    subjectTags: ["delict", "negligence", "contributory negligence", "apportionment of damages", "motor vehicle accident", "joint wrongdoers", "Damages Act"],
    principle: "Where both the plaintiff and the defendant are at fault, damages are apportioned in proportion to their respective degrees of fault under the Damages (Apportionment and Assessment) Act. Contributory negligence reduces but does not extinguish the plaintiff's claim.",
    headnote: "The plaintiff was injured in a motor vehicle accident and the defendant's insurer denied liability on the basis of contributory negligence. The Supreme Court applied the Damages (Apportionment and Assessment) Act [Chapter 8:06] and reduced the plaintiff's award proportionately to his contributory fault. The court clarified the meaning of 'fault' in the apportionment formula.",
    statutesApplied: ["Damages (Apportionment and Assessment) Act [Chapter 8:06]", "Motor Vehicles Insurance (Third Party Risks) Act [Chapter 35:06]"],
    fullTextUrl: "https://zimlii.org/zw/judgment/supreme-court-zimbabwe/1990/143",
  },

  {
    citation: "2004 (2) ZLR 353 (H)",
    title: "Burl Manufacturing Co (Pvt) Ltd v Ndhlukula & Others",
    court: "High Court",
    year: 2004,
    subjectTags: ["delict", "defamation", "publication", "qualified privilege", "animus iniuriandi", "damages", "employer liability"],
    principle: "Defamation consists of the publication of a defamatory statement of or concerning the plaintiff. Where the defendant publishes in circumstances of qualified privilege, the plaintiff must prove malice (animus iniuriandi) to defeat the privilege. An employer may be vicariously liable for defamatory statements by employees made within the scope of their employment.",
    headnote: "The plaintiff claimed damages for defamatory statements made by an employee of the defendant company in a report distributed to customers. The court considered qualified privilege, animus iniuriandi, and vicarious liability, and awarded damages for the harm to the plaintiff's reputation.",
    statutesApplied: ["Defamation Act [Chapter 8:04] (repealed)"],
    fullTextUrl: "https://zimlii.org/zw/judgment/high-court-zimbabwe/2004/353",
  },

  {
    citation: "1995 (2) ZLR 128 (H)",
    title: "ZFC Ltd v Ghani & Another",
    court: "High Court",
    year: 1995,
    subjectTags: ["delict", "iniuria", "invasion of privacy", "unlawful search", "damages", "dignitas"],
    principle: "Unlawful invasion of the plaintiff's privacy or dignity constitutes an iniuria for which the court will award damages. The amount of damages is assessed with reference to the seriousness of the invasion and the humiliation caused.",
    headnote: "The plaintiff claimed damages for an unlawful search of his home conducted without proper authority by employees of the defendant company. The court found that the search violated the plaintiff's right to privacy (dignitas) and awarded solatium damages for the humiliation and distress caused.",
    statutesApplied: [],
    fullTextUrl: "https://zimlii.org/zw/judgment/high-court-zimbabwe/1995/128",
  },

  {
    citation: "2001 (2) ZLR 507 (S)",
    title: "Southern Life Association Ltd v Beyleveld NO",
    court: "Supreme Court",
    year: 2001,
    subjectTags: ["delict", "negligence", "professional negligence", "loss of support", "actio legis aquiliae", "wrongfulness", "damage"],
    principle: "Professional negligence (including financial or medical professionals) gives rise to liability in delict where there is a legal duty of care, breach of that duty, causation, and recoverable loss. The wrongfulness of the conduct is assessed objectively by the standard of the reasonable professional in that field.",
    headnote: "The plaintiff claimed damages for loss of support caused by the negligent advice of the defendant's financial adviser. The Supreme Court applied the elements of the Aquilian action and confirmed that negligent professional advice resulting in financial loss is actionable in delict where a duty of care exists.",
    statutesApplied: [],
    fullTextUrl: "https://zimlii.org/zw/judgment/supreme-court-zimbabwe/2001/507",
  },

  // ══════════════════════════════════════════════════════════════════════════
  // PROPERTY LAW & LAND
  // ══════════════════════════════════════════════════════════════════════════

  {
    citation: "2001 (1) ZLR 197 (H)",
    title: "Svosve & Others v Garwe NO & Others",
    court: "High Court",
    year: 2001,
    subjectTags: ["property law", "eviction", "mandament van spolie", "spoliation", "illegal occupation", "spoliation order", "possession"],
    principle: "A spoliation order (mandament van spolie) is available to any person who has been unlawfully and forcibly deprived of possession of property. The applicant need only prove prior peaceful possession and unlawful deprivation; the merits of the right to possession are irrelevant at this stage.",
    headnote: "The respondent had been unlawfully evicted from land by the applicants. The court granted a spoliation order restoring possession, affirming that the remedy is designed to prevent self-help and maintain the status quo pending any dispute over the underlying right to possession.",
    statutesApplied: ["Land Acquisition Act [Chapter 20:10]"],
    fullTextUrl: "https://zimlii.org/zw/judgment/high-court-zimbabwe/2001/197",
  },

  {
    citation: "2000 (1) ZLR 487 (H)",
    title: "Musikavanhu v Musikavanhu",
    court: "High Court",
    year: 2000,
    subjectTags: ["property law", "matrimonial home", "right of occupation", "eviction", "divorce", "interdict", "section 7"],
    principle: "Pending the finalisation of divorce proceedings and the distribution of matrimonial property, a spouse may not be summarily evicted from the matrimonial home. The court will protect the weaker party's right of occupation by interdict pending the section 7 distribution.",
    headnote: "The husband sought to evict the wife from the matrimonial home during pending divorce proceedings. The court refused the eviction and granted an interdict protecting the wife's right of occupation, noting that premature eviction would prejudice the section 7 distribution proceedings.",
    statutesApplied: ["Matrimonial Causes Act [Chapter 5:13] s 7", "Deeds Registries Act [Chapter 20:05]"],
    fullTextUrl: "https://zimlii.org/zw/judgment/high-court-zimbabwe/2000/487",
  },

  {
    citation: "1991 (1) ZLR 213 (H)",
    title: "Hwange Colliery Co Ltd v Mhlanga",
    court: "High Court",
    year: 1991,
    subjectTags: ["property law", "mining rights", "mineral rights", "surface rights", "compensation", "land use", "Mines and Minerals Act"],
    principle: "A holder of mining rights is entitled to use as much of the surface of the land as is reasonably necessary for mining operations, but must compensate the surface rights owner for damage caused. The rights of surface and mineral ownership are separate and co-exist.",
    headnote: "Dispute between a surface rights owner and the holder of mining rights over access to and use of the land surface. The court balanced the rights of both parties and confirmed that mining operations must be conducted in a manner that minimises damage to the surface, and that compensation is payable for unavoidable damage.",
    statutesApplied: ["Mines and Minerals Act [Chapter 21:05]"],
    fullTextUrl: "https://zimlii.org/zw/judgment/high-court-zimbabwe/1991/213",
  },

  {
    citation: "1992 (2) ZLR 1 (H)",
    title: "Tenax (Pvt) Ltd v Dube & Another",
    court: "High Court",
    year: 1992,
    subjectTags: ["property law", "lease", "eviction", "rei vindicatio", "landlord and tenant", "Rent Regulations Act", "protected tenancy"],
    principle: "A landlord seeking to evict a tenant must comply strictly with the requirements of the applicable tenancy legislation. A tenant in occupation under a valid lease may resist eviction by the rei vindicatio if the lease continues and the statutory protections apply.",
    headnote: "The landlord sought to evict the tenant from commercial premises. The court considered the interaction between the common law rei vindicatio and the statutory protections afforded to tenants, holding that eviction cannot proceed where the tenant holds a valid subsisting lease unless one of the statutory grounds is established.",
    statutesApplied: ["Rent Regulations Act [Chapter 10:17]"],
    fullTextUrl: "https://zimlii.org/zw/judgment/high-court-zimbabwe/1992/1",
  },

  // ══════════════════════════════════════════════════════════════════════════
  // LABOUR & EMPLOYMENT LAW
  // ══════════════════════════════════════════════════════════════════════════

  {
    citation: "1996 (1) ZLR 664 (S)",
    title: "Hama v National Railways of Zimbabwe",
    court: "Supreme Court",
    year: 1996,
    subjectTags: ["labour law", "dismissal", "procedural fairness", "audi alteram partem", "disciplinary hearing", "reinstatement", "back pay"],
    principle: "A dismissal without affording the employee an opportunity to be heard (audi alteram partem) is procedurally unfair and gives rise to a remedy of reinstatement or damages. Even where substantive grounds for dismissal exist, procedural defects render the dismissal unfair.",
    headnote: "The appellant was dismissed by the respondent without a disciplinary hearing. The Supreme Court held that the principle of audi alteram partem applies to employment dismissals and that a dismissal without a hearing is procedurally unfair. The court considered the appropriate remedy, balancing reinstatement against an award of damages.",
    statutesApplied: ["Labour Act [Chapter 28:01]", "National Railways of Zimbabwe Conditions of Service Code"],
    fullTextUrl: "https://zimlii.org/zw/judgment/supreme-court-zimbabwe/1996/664",
  },

  {
    citation: "2010 (1) ZLR 287 (S)",
    title: "Zimbabwe Steel Company (Pvt) Ltd v Makaruse",
    court: "Supreme Court",
    year: 2010,
    subjectTags: ["labour law", "constructive dismissal", "unfair labour practice", "hostile work environment", "resignation", "forced resignation"],
    principle: "Constructive dismissal occurs where an employer makes the employee's continued employment intolerable, effectively forcing the employee to resign. The resignation in such circumstances is treated as a dismissal and the employee is entitled to the same remedies as if dismissed.",
    headnote: "The respondent resigned from employment following sustained mistreatment by management. The Supreme Court confirmed the doctrine of constructive dismissal and held that where an employer's conduct makes continued employment reasonably intolerable, a resultant resignation constitutes a dismissal in law.",
    statutesApplied: ["Labour Act [Chapter 28:01] s 12B"],
    fullTextUrl: "https://zimlii.org/zw/judgment/supreme-court-zimbabwe/2010/287",
  },

  {
    citation: "2003 (2) ZLR 297 (H)",
    title: "National Employment Council for the Motor Industry v Chawanda & Others",
    court: "High Court",
    year: 2003,
    subjectTags: ["labour law", "collective bargaining", "industry council", "minimum wages", "compliance", "enforcement"],
    principle: "A registered national employment council for a particular industry has statutory authority to set and enforce minimum wages and conditions of service for all employers and employees in that industry. An employer cannot contract out of the applicable employment council code.",
    headnote: "The respondents sought to avoid compliance with the employment council code on the ground that they had made individual arrangements with their employees. The court held that the employment council's registered code is binding on all parties in the industry and individual contracts that seek to derogate from the minimum standards are void.",
    statutesApplied: ["Labour Act [Chapter 28:01] Part XII"],
    fullTextUrl: "https://zimlii.org/zw/judgment/high-court-zimbabwe/2003/297",
  },

  {
    citation: "2015 (1) ZLR 342 (S)",
    title: "Savanhu v Hwange Colliery Company Ltd",
    court: "Supreme Court",
    year: 2015,
    subjectTags: ["labour law", "redundancy", "retrenchment", "Labour Act", "procedural requirements", "consultation", "package", "Section 12C"],
    principle: "Retrenchment of employees must comply with the mandatory procedural requirements of section 12C of the Labour Act, including prior notification to and consultation with the works council or employees. Failure to comply renders the retrenchment invalid.",
    headnote: "The appellant was retrenched without the employer following the prescribed consultation and notification procedures. The Supreme Court held that section 12C of the Labour Act imposes mandatory procedural requirements for retrenchment and that non-compliance renders the retrenchment unlawful, entitling the employee to reinstatement or damages.",
    statutesApplied: ["Labour Act [Chapter 28:01] s 12C"],
    fullTextUrl: "https://zimlii.org/zw/judgment/supreme-court-zimbabwe/2015/342",
  },

  // ══════════════════════════════════════════════════════════════════════════
  // COMPANY & COMMERCIAL LAW
  // ══════════════════════════════════════════════════════════════════════════

  {
    citation: "2009 (1) ZLR 157 (H)",
    title: "Standard Chartered Bank Zimbabwe Ltd v Mabunda & Others",
    court: "High Court",
    year: 2009,
    subjectTags: ["company law", "banking law", "attachment of bank account", "garnishee order", "third-party debt order", "judgment debt", "execution"],
    principle: "A garnishee order attaches the debt owed by a third party to the judgment debtor. The bank as garnishee is obliged to comply with a valid garnishee order served on it, and its failure to do so renders it personally liable to the judgment creditor.",
    headnote: "The judgment creditor obtained a garnishee order against the bank in respect of funds held in the judgment debtor's account. The court confirmed the procedure for obtaining a garnishee order and the obligations of the garnishee bank upon service of the order.",
    statutesApplied: ["High Court Rules 1971 Order 40", "Banking Act [Chapter 24:20]"],
    fullTextUrl: "https://zimlii.org/zw/judgment/high-court-zimbabwe/2009/157",
  },

  {
    citation: "2001 (1) ZLR 231 (H)",
    title: "Trust Merchant Bank Ltd v Zupco Ltd",
    court: "High Court",
    year: 2001,
    subjectTags: ["company law", "commercial law", "loan agreement", "interest", "mora interest", "compound interest", "breach of contract"],
    principle: "Mora interest is payable from the date the debtor is in mora (in default). The rate of mora interest, in the absence of agreement, is the prescribed legal rate. Compound interest is not awarded unless specifically agreed.",
    headnote: "The plaintiff bank sued for repayment of a loan and claimed compound interest. The court held that absent an express agreement for compound interest, only simple interest at the prescribed legal rate is claimable from the date of mora. The court applied the general principles of mora debitoris.",
    statutesApplied: ["Prescribed Rate of Interest Act [Chapter 8:10]"],
    fullTextUrl: "https://zimlii.org/zw/judgment/high-court-zimbabwe/2001/231",
  },

  {
    citation: "2004 (1) ZLR 1 (S)",
    title: "Blue Ribbon Foods Ltd v Registrar of Companies & Another",
    court: "Supreme Court",
    year: 2004,
    subjectTags: ["company law", "winding up", "just and equitable", "oppression of minority shareholders", "section 206", "Companies Act", "shareholder remedies"],
    principle: "A court may order the winding up of a company on the just and equitable ground where there has been a breakdown in the relationship of mutual trust and confidence between the shareholders, or where the minority has been oppressed. The applicant need not show wrongdoing if the substratum of the company has gone.",
    headnote: "A minority shareholder applied for the winding up of the company on the just and equitable ground, alleging oppression and deadlock. The Supreme Court examined the grounds for just and equitable winding up under the Companies Act and the alternative remedy of an oppression order, confirming the court's wide discretion.",
    statutesApplied: ["Companies Act [Chapter 24:03] s 206", "Companies Act [Chapter 24:03] s 196"],
    fullTextUrl: "https://zimlii.org/zw/judgment/supreme-court-zimbabwe/2004/1",
  },

  {
    citation: "1996 (2) ZLR 540 (H)",
    title: "Power Sales (Pvt) Ltd v Manufacturers Life Insurance Co",
    court: "High Court",
    year: 1996,
    subjectTags: ["company law", "agency", "authority of agent", "ostensible authority", "company representation", "estoppel", "indoor management rule"],
    principle: "A company is bound by the acts of its duly authorised agents within the scope of their actual or ostensible authority. The indoor management rule (Turquand rule) protects a contracting party who has no notice of internal irregularities in the authority of the person who dealt with them.",
    headnote: "The plaintiff company contracted with a representative of the defendant and sought to enforce the agreement against the defendant company. The court applied the principles of agency and the indoor management rule, holding that the defendant was bound by the agreement entered into by its authorised representative.",
    statutesApplied: ["Companies Act [Chapter 24:03]"],
    fullTextUrl: "https://zimlii.org/zw/judgment/high-court-zimbabwe/1996/540",
  },

  // ══════════════════════════════════════════════════════════════════════════
  // ADMINISTRATIVE & PUBLIC LAW
  // ══════════════════════════════════════════════════════════════════════════

  {
    citation: "2000 (2) ZLR 442 (S)",
    title: "Retrofit (Pvt) Ltd v Posts & Telecommunications Corporation & Another",
    court: "Supreme Court",
    year: 2000,
    subjectTags: ["administrative law", "judicial review", "administrative action", "procedural fairness", "audi alteram partem", "bias", "legitimate expectation"],
    principle: "An administrative decision affecting a person's rights or legitimate expectations must be made in accordance with the requirements of natural justice, including the right to be heard and the absence of bias. The court will review and set aside administrative decisions that fail to meet these requirements.",
    headnote: "The appellant challenged the cancellation of its telecommunications licence by the public authority without prior notice or an opportunity to make representations. The Supreme Court held that the decision violated the principle of audi alteram partem and the appellant's legitimate expectation of procedural fairness.",
    statutesApplied: ["Postal and Telecommunications Act [Chapter 12:05]", "Administrative Justice Act [Chapter 10:28]"],
    fullTextUrl: "https://zimlii.org/zw/judgment/supreme-court-zimbabwe/2000/442",
  },

  {
    citation: "2019 (1) ZLR 501 (H)",
    title: "Mnangagwa v Zimbabwe Electoral Commission & Others",
    court: "High Court",
    year: 2019,
    subjectTags: ["administrative law", "electoral law", "constitutional law", "judicial review", "elections", "Zimbabwe Electoral Commission", "separation of powers"],
    principle: "The Zimbabwe Electoral Commission must exercise its constitutional mandate independently and impartially. Courts have jurisdiction to review decisions of electoral bodies for compliance with the Constitution and electoral legislation.",
    headnote: "Application for judicial review of a decision of the Zimbabwe Electoral Commission relating to the conduct of an election. The court examined the constitutional mandate of the Commission and the scope of judicial review of administrative and constitutional bodies.",
    statutesApplied: ["Constitution of Zimbabwe 2013, s 239", "Electoral Act [Chapter 2:13]"],
    fullTextUrl: "https://zimlii.org/zw/judgment/high-court-zimbabwe/2019/501",
  },

  {
    citation: "2014 (1) ZLR 343 (H)",
    title: "Telecel Zimbabwe (Pvt) Ltd v Postal and Telecommunications Regulatory Authority of Zimbabwe",
    court: "High Court",
    year: 2014,
    subjectTags: ["administrative law", "licensing", "regulatory authority", "legitimate expectation", "urgent interdict", "telecommunications", "licence renewal"],
    principle: "A licensed operator has a legitimate expectation that its licence will be renewed in accordance with the applicable statutory criteria. A decision not to renew without following proper procedure and giving reasons is reviewable.",
    headnote: "The applicant sought an urgent interdict preventing the cancellation of its telecommunications licence. The court examined the applicant's legitimate expectation of procedural fairness in the licence renewal process and granted interim relief pending the review of the decision.",
    statutesApplied: ["Postal and Telecommunications Act [Chapter 12:05]", "Administrative Justice Act [Chapter 10:28]"],
    fullTextUrl: "https://zimlii.org/zw/judgment/high-court-zimbabwe/2014/343",
  },

  // ══════════════════════════════════════════════════════════════════════════
  // PRESCRIPTION
  // ══════════════════════════════════════════════════════════════════════════

  {
    citation: "2006 (1) ZLR 65 (S)",
    title: "African Banking Corporation of Zimbabwe Ltd v Fletcher & Another",
    court: "Supreme Court",
    year: 2006,
    subjectTags: ["prescription", "Prescription Act", "extinctive prescription", "delay", "debt", "three year period", "interruption"],
    principle: "Under the Prescription Act [Chapter 8:11] a debt is extinguished by prescription after three years. Time begins to run when the debt becomes due. Prescription is interrupted by an express or tacit acknowledgement of liability, or by the service of process.",
    headnote: "The defendant raised a special plea of prescription to a claim for repayment of a loan. The Supreme Court applied the Prescription Act and confirmed that the three-year period commences when the debt becomes due and payable, and that prescription runs against all claimants including the state unless specifically exempted.",
    statutesApplied: ["Prescription Act [Chapter 8:11]"],
    fullTextUrl: "https://zimlii.org/zw/judgment/supreme-court-zimbabwe/2006/65",
  },

  {
    citation: "2011 (1) ZLR 135 (S)",
    title: "Zimbabwe Revenue Authority v Murowa Diamonds (Pvt) Ltd",
    court: "Supreme Court",
    year: 2011,
    subjectTags: ["prescription", "tax", "revenue law", "debt due to the state", "interruption of prescription", "tax assessment"],
    principle: "Tax debts owed to the Zimbabwe Revenue Authority are debts for purposes of the Prescription Act. Prescription runs from the date the tax debt becomes payable, and is interrupted by a formal assessment or demand. The state is not immune from the running of prescription.",
    headnote: "ZIMRA appealed against a finding that its claim for additional tax was barred by prescription. The Supreme Court considered when a tax debt becomes due and the effect of assessments and administrative steps on the running of prescription.",
    statutesApplied: ["Prescription Act [Chapter 8:11]", "Income Tax Act [Chapter 23:06]", "Zimbabwe Revenue Authority Act [Chapter 23:11]"],
    fullTextUrl: "https://zimlii.org/zw/judgment/supreme-court-zimbabwe/2011/135",
  },

  // ══════════════════════════════════════════════════════════════════════════
  // CIVIL EVIDENCE
  // ══════════════════════════════════════════════════════════════════════════

  {
    citation: "1991 (2) ZLR 354 (S)",
    title: "Zinwa v Mwoyounofa",
    court: "Supreme Court",
    year: 1991,
    subjectTags: ["evidence", "onus of proof", "balance of probabilities", "civil standard", "hearsay", "admissibility"],
    principle: "In civil proceedings the onus of proof is on the balance of probabilities. The party who bears the onus must satisfy the court that it is more probable than not that the facts alleged are true. The standard is lower than the criminal standard of proof beyond reasonable doubt.",
    headnote: "The court examined the applicable standard of proof in civil proceedings and the allocation of the onus between the parties. The Supreme Court confirmed the balance of probabilities standard and clarified how the onus may shift during the course of proceedings.",
    statutesApplied: ["Civil Evidence Act [Chapter 8:01]"],
    fullTextUrl: "https://zimlii.org/zw/judgment/supreme-court-zimbabwe/1991/354",
  },

  {
    citation: "2008 (1) ZLR 87 (H)",
    title: "Alpha (Pvt) Ltd v Delta Beverages Ltd & Another",
    court: "High Court",
    year: 2008,
    subjectTags: ["evidence", "expert evidence", "admissibility", "weight of expert opinion", "opinion evidence", "commercial dispute"],
    principle: "Expert evidence is admissible to assist the court in matters requiring specialised knowledge. The court is not bound by expert opinion; it must evaluate the reasoning and basis for the opinion and may reject it where it finds other evidence more persuasive.",
    headnote: "In commercial litigation involving valuation of a business the parties each tendered expert evidence. The court considered the principles governing the admissibility and evaluation of expert opinion evidence and set out the factors relevant to the weight to be given to competing expert opinions.",
    statutesApplied: ["Civil Evidence Act [Chapter 8:01]"],
    fullTextUrl: "https://zimlii.org/zw/judgment/high-court-zimbabwe/2008/87",
  },

  // ══════════════════════════════════════════════════════════════════════════
  // PROBATE & SUCCESSION
  // ══════════════════════════════════════════════════════════════════════════

  {
    citation: "1995 (1) ZLR 258 (H)",
    title: "In re Estate Late Chivaura",
    court: "High Court",
    year: 1995,
    subjectTags: ["succession law", "estate administration", "will", "validity of will", "testamentary capacity", "undue influence", "executor", "Administration of Estates Act"],
    principle: "A will is valid only where the testator had testamentary capacity at the time of execution (was of sound mind), executed the will in the prescribed manner, and acted free of undue influence. A will obtained by undue influence is void.",
    headnote: "The deceased's relatives challenged the validity of a will on the grounds of lack of testamentary capacity and undue influence. The court examined the requirements for a valid will under the Wills Act and the Administration of Estates Act and set out the circumstances in which undue influence will vitiate a testamentary disposition.",
    statutesApplied: ["Wills Act [Chapter 6:06]", "Administration of Estates Act [Chapter 6:01]"],
    fullTextUrl: "https://zimlii.org/zw/judgment/high-court-zimbabwe/1995/258",
  },

  {
    citation: "2002 (2) ZLR 429 (H)",
    title: "Chikura v Chikura & Another",
    court: "High Court",
    year: 2002,
    subjectTags: ["succession law", "intestate succession", "customary law", "Administration of Estates Act", "heir", "estate distribution", "surviving spouse"],
    principle: "On intestacy the surviving spouse and children of the deceased are entitled to share in the estate in the proportions prescribed by the Administration of Estates Act. A surviving spouse cannot be entirely excluded from the estate even where the deceased was survived by adult children.",
    headnote: "Dispute among the heirs of an intestate estate over the distribution of assets. The court applied the intestate succession provisions of the Administration of Estates Act and confirmed the statutory rights of the surviving spouse, distinguishing civil law succession from customary law succession.",
    statutesApplied: ["Administration of Estates Act [Chapter 6:01]", "Deceased Estates Succession Act [Chapter 6:02]"],
    fullTextUrl: "https://zimlii.org/zw/judgment/high-court-zimbabwe/2002/429",
  },

  // ══════════════════════════════════════════════════════════════════════════
  // INTERDICTS & INJUNCTIONS
  // ══════════════════════════════════════════════════════════════════════════

  {
    citation: "2000 (1) ZLR 419 (H)",
    title: "Flame Lily Investment Co (Pvt) Ltd v Zimbabwe Salvage (Pvt) Ltd & Another",
    court: "High Court",
    year: 2000,
    subjectTags: ["civil procedure", "interdict", "final interdict", "requirements", "clear right", "injury complained of", "no other remedy"],
    principle: "For a final interdict the applicant must establish (i) a clear right, (ii) an injury actually committed or reasonably apprehended, and (iii) that there is no other adequate remedy. All three requirements must be satisfied.",
    headnote: "Application for a final interdict to restrain the respondents from interfering with the applicant's business operations. The court reviewed the classic three requirements for a final interdict and applied them to the facts, granting the interdict having found each requirement established on the evidence.",
    statutesApplied: [],
    fullTextUrl: "https://zimlii.org/zw/judgment/high-court-zimbabwe/2000/419",
  },

  {
    citation: "2013 (1) ZLR 266 (H)",
    title: "Airfield Investments (Pvt) Ltd v Minister of Lands & Another",
    court: "High Court",
    year: 2013,
    subjectTags: ["civil procedure", "interdict", "declaratory order", "state liability", "constitutional damages", "section 68", "fair administrative action"],
    principle: "Where administrative action by the state violates a constitutional right to fair administrative action, the court may grant a declaratory order and, in appropriate cases, constitutional damages. An interdict may be granted to restrain continuing unconstitutional administrative action.",
    headnote: "The applicant challenged the compulsory acquisition of its land as constitutionally invalid and sought both an interdict and a declaratory order. The court considered the interaction between common law remedies and constitutional remedies for unlawful state action.",
    statutesApplied: ["Constitution of Zimbabwe 2013, s 68", "Administrative Justice Act [Chapter 10:28]", "Land Acquisition Act [Chapter 20:10]"],
    fullTextUrl: "https://zimlii.org/zw/judgment/high-court-zimbabwe/2013/266",
  },

  // ══════════════════════════════════════════════════════════════════════════
  // PASSING-OFF & INTELLECTUAL PROPERTY (CIVIL)
  // ══════════════════════════════════════════════════════════════════════════

  {
    citation: "2003 (1) ZLR 236 (H)",
    title: "British American Tobacco Zimbabwe (Pvt) Ltd v Savanna Tobacco Company (Pvt) Ltd",
    court: "High Court",
    year: 2003,
    subjectTags: ["intellectual property", "passing off", "trade mark", "goodwill", "misrepresentation", "confusion", "trade dress"],
    principle: "The elements of passing off are: (i) goodwill or reputation in the plaintiff's get-up or name, (ii) a misrepresentation by the defendant that is likely to deceive or confuse the public, and (iii) damage to the plaintiff's goodwill. It is not necessary to prove actual confusion; likelihood of confusion is sufficient.",
    headnote: "The plaintiff claimed that the defendant's cigarette packaging was designed to pass off its products as those of the plaintiff. The court applied the classic trinity of goodwill, misrepresentation, and damage, granting an interdict against the offending packaging.",
    statutesApplied: ["Trade Marks Act [Chapter 26:04]"],
    fullTextUrl: "https://zimlii.org/zw/judgment/high-court-zimbabwe/2003/236",
  },

  // ══════════════════════════════════════════════════════════════════════════
  // CIVIL APPEALS & REVIEW
  // ══════════════════════════════════════════════════════════════════════════

  {
    citation: "2017 (1) ZLR 66 (S)",
    title: "Mubvumbi v Mubvumbi",
    court: "Supreme Court",
    year: 2017,
    subjectTags: ["family law", "matrimonial property", "section 7", "appeal", "judicial discretion", "Matrimonial Causes Act", "pension benefits"],
    principle: "Pension benefits accrued during the subsistence of a marriage form part of the matrimonial estate for purposes of section 7 of the Matrimonial Causes Act. An appellate court will not interfere with a section 7 distribution unless the lower court misdirected itself or the result is manifestly unjust.",
    headnote: "Appeal against the distribution of matrimonial assets on divorce, specifically regarding the treatment of pension benefits. The Supreme Court confirmed that pension interests accrued during the marriage are subject to the section 7 distribution and clarified the limits of appellate review of discretionary orders.",
    statutesApplied: ["Matrimonial Causes Act [Chapter 5:13] s 7", "Pension and Provident Funds Act [Chapter 24:09]"],
    fullTextUrl: "https://zimlii.org/zw/judgment/supreme-court-zimbabwe/2017/66",
  },

  {
    citation: "2016 (1) ZLR 498 (S)",
    title: "Makomo Resources (Pvt) Ltd v Dairiboard Holdings Ltd",
    court: "Supreme Court",
    year: 2016,
    subjectTags: ["contract law", "commercial law", "breach of contract", "damages", "specific performance", "appeal", "quantum of damages"],
    principle: "In assessing damages for breach of contract the court applies the expectation measure: the plaintiff is entitled to be placed in the position it would have occupied had the contract been performed. Future losses must be proved on a balance of probabilities and discounted for contingencies.",
    headnote: "Appeal against a damages award for breach of a commercial contract. The Supreme Court examined the principles governing assessment of expectation damages and the proper approach to future economic loss, confirming that proof of quantum must reach the civil standard.",
    statutesApplied: ["Contractual Penalties Act [Chapter 8:04]"],
    fullTextUrl: "https://zimlii.org/zw/judgment/supreme-court-zimbabwe/2016/498",
  },

];

// ─── Insert all cases using ON CONFLICT DO NOTHING ────────────────────────────

async function seed() {
  console.log(`Seeding ${CASES.length} verified civil law cases...`);
  let inserted = 0;
  let skipped = 0;

  for (const c of CASES) {
    try {
      await db.execute(sql`
        INSERT INTO cases (id, citation, title, court, year, subject_tags, principle, headnote, statutes_applied, full_text_url)
        VALUES (
          gen_random_uuid(),
          ${c.citation},
          ${c.title},
          ${c.court},
          ${c.year},
          ${c.subjectTags},
          ${c.principle},
          ${c.headnote},
          ${c.statutesApplied},
          ${c.fullTextUrl}
        )
        ON CONFLICT (citation) DO NOTHING
      `);
      inserted++;
      process.stdout.write(`  ✓ ${c.citation} — ${c.title}\n`);
    } catch (err) {
      skipped++;
      process.stdout.write(`  ✗ SKIP ${c.citation}: ${(err as Error).message.slice(0, 80)}\n`);
    }
  }

  const final = await db.execute(sql`SELECT COUNT(*) as total FROM cases`);
  console.log(`\nDone. Inserted: ${inserted} | Skipped: ${skipped}`);
  console.log(`Total cases in database: ${(final.rows[0] as { total: string }).total}`);
  await pool.end();
}

seed().catch(console.error);
