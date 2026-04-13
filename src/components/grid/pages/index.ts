import type { PageDef, NavCell } from "../types";
import { homePage } from "./home";
import { enterPage } from "./home/enter";
import { prizesPage } from "./home/prizes";
import { readmorePage } from "./home/readmore";
import { faqPage } from "./home/readmore/faq";

// ---------------------------------------------------------------------------
// Flat registry — O(1) lookup by page ID
// ---------------------------------------------------------------------------

const ALL_PAGES: Record<string, PageDef> = {
  home: homePage,
  prizes: prizesPage,
  enter: enterPage,
  readmore: readmorePage,
  faq: faqPage,
};

export const ROOT_PAGE_ID = "home";

export function getPage(id: string): PageDef | undefined {
  return ALL_PAGES[id];
}

export function getRootPage(): PageDef {
  return ALL_PAGES[ROOT_PAGE_ID]!;
}

// ---------------------------------------------------------------------------
// Parent/child lookups
// ---------------------------------------------------------------------------

/** Find the nav cell on `parentPageId` that targets `targetPageId`. */
export function findParentCell(
  parentPageId: string,
  targetPageId: string,
): { page: PageDef; cell: NavCell } | undefined {
  const page = ALL_PAGES[parentPageId];
  if (!page) return undefined;
  const cell = page.cells.find(
    (c) => c.kind === "nav" && c.target === targetPageId,
  ) as NavCell | undefined;
  if (!cell) return undefined;
  return { page, cell };
}

// ---------------------------------------------------------------------------
// Breadcrumbs
// ---------------------------------------------------------------------------

export function buildBreadcrumbs(
  path: { pageId: string }[],
): { pageId: string; label: string; depth: number }[] {
  const root = getRootPage();
  const crumbs = [{ pageId: root.id, label: root.label, depth: 0 }];
  for (let i = 0; i < path.length; i++) {
    const page = ALL_PAGES[path[i].pageId];
    if (page) {
      crumbs.push({ pageId: page.id, label: page.label, depth: i + 1 });
    }
  }
  return crumbs;
}

// ---------------------------------------------------------------------------
// Page tree (for hamburger menu)
// ---------------------------------------------------------------------------

export interface PageTreeNode {
  page: PageDef;
  children: PageTreeNode[];
}

export function buildPageTree(
  rootId: string = ROOT_PAGE_ID,
  visited: Set<string> = new Set(),
): PageTreeNode | undefined {
  if (visited.has(rootId)) return undefined; // prevent cycles
  const page = ALL_PAGES[rootId];
  if (!page) return undefined;
  visited.add(rootId);

  const children: PageTreeNode[] = [];
  for (const cell of page.cells) {
    if (cell.kind === "nav") {
      const child = buildPageTree(cell.target, visited);
      if (child) children.push(child);
    }
  }
  return { page, children };
}
