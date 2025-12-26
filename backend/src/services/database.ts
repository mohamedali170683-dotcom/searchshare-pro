import { PrismaClient } from '@prisma/client';

// Singleton pattern for Prisma client
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma || new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

// Project operations
export const projectService = {
  async create(data: {
    name: string;
    domain: string;
    brandName: string;
    locationCode?: number;
    languageCode?: string;
  }) {
    return prisma.project.create({ data });
  },

  async findById(id: string) {
    return prisma.project.findUnique({
      where: { id },
      include: {
        brandKeywords: true,
        categoryKeywords: true,
        competitors: true,
      },
    });
  },

  async findAll() {
    return prisma.project.findMany({
      orderBy: { updatedAt: 'desc' },
    });
  },

  async update(id: string, data: Partial<{
    name: string;
    domain: string;
    brandName: string;
    locationCode: number;
    languageCode: string;
  }>) {
    return prisma.project.update({
      where: { id },
      data,
    });
  },

  async delete(id: string) {
    return prisma.project.delete({ where: { id } });
  },
};

// Brand keyword operations
export const brandKeywordService = {
  async upsertMany(projectId: string, keywords: Array<{
    keyword: string;
    searchVolume: number;
    isOwnBrand: boolean;
  }>) {
    const operations = keywords.map(kw =>
      prisma.brandKeyword.upsert({
        where: {
          projectId_keyword: { projectId, keyword: kw.keyword },
        },
        update: {
          searchVolume: kw.searchVolume,
          isOwnBrand: kw.isOwnBrand,
        },
        create: {
          projectId,
          keyword: kw.keyword,
          searchVolume: kw.searchVolume,
          isOwnBrand: kw.isOwnBrand,
        },
      })
    );
    return prisma.$transaction(operations);
  },

  async findByProject(projectId: string) {
    return prisma.brandKeyword.findMany({
      where: { projectId },
      orderBy: { searchVolume: 'desc' },
    });
  },

  async delete(id: string) {
    return prisma.brandKeyword.delete({ where: { id } });
  },
};

// Category keyword operations
export const categoryKeywordService = {
  async upsertMany(projectId: string, keywords: Array<{
    keyword: string;
    searchVolume: number;
    difficulty?: number;
    groupName?: string;
  }>) {
    const operations = keywords.map(kw =>
      prisma.categoryKeyword.upsert({
        where: {
          projectId_keyword: { projectId, keyword: kw.keyword },
        },
        update: {
          searchVolume: kw.searchVolume,
          difficulty: kw.difficulty,
          groupName: kw.groupName,
        },
        create: {
          projectId,
          keyword: kw.keyword,
          searchVolume: kw.searchVolume,
          difficulty: kw.difficulty,
          groupName: kw.groupName,
        },
      })
    );
    return prisma.$transaction(operations);
  },

  async findByProject(projectId: string) {
    return prisma.categoryKeyword.findMany({
      where: { projectId },
      orderBy: { searchVolume: 'desc' },
    });
  },

  async findByGroup(projectId: string, groupName: string) {
    return prisma.categoryKeyword.findMany({
      where: { projectId, groupName },
      orderBy: { searchVolume: 'desc' },
    });
  },

  async delete(id: string) {
    return prisma.categoryKeyword.delete({ where: { id } });
  },
};

// Competitor operations
export const competitorService = {
  async create(data: {
    projectId: string;
    domain: string;
    brandName: string;
    brandKeywords?: string[];
  }) {
    return prisma.competitor.create({ data });
  },

  async findByProject(projectId: string) {
    return prisma.competitor.findMany({
      where: { projectId },
      orderBy: { brandName: 'asc' },
    });
  },

  async update(id: string, data: Partial<{
    domain: string;
    brandName: string;
    brandKeywords: string[];
  }>) {
    return prisma.competitor.update({
      where: { id },
      data,
    });
  },

  async delete(id: string) {
    return prisma.competitor.delete({ where: { id } });
  },
};

// Snapshot operations for historical tracking
export const snapshotService = {
  async create(data: {
    projectId: string;
    shareOfSearch: number;
    brandVolume: number;
    totalBrandVolume: number;
    shareOfVoice: number;
    visibleVolume: number;
    totalMarketVolume: number;
    growthGap: number;
    interpretation: string;
    keywordBreakdown?: object;
  }) {
    return prisma.snapshot.create({ data });
  },

  async findByProject(projectId: string, limit = 30) {
    return prisma.snapshot.findMany({
      where: { projectId },
      orderBy: { snapshotDate: 'desc' },
      take: limit,
      include: {
        competitorMetrics: {
          include: { competitor: true },
        },
      },
    });
  },

  async findLatest(projectId: string) {
    return prisma.snapshot.findFirst({
      where: { projectId },
      orderBy: { snapshotDate: 'desc' },
      include: {
        competitorMetrics: {
          include: { competitor: true },
        },
      },
    });
  },

  async getHistory(projectId: string, startDate: Date, endDate: Date) {
    return prisma.snapshot.findMany({
      where: {
        projectId,
        snapshotDate: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: { snapshotDate: 'asc' },
    });
  },
};

// Competitor metrics operations
export const competitorMetricsService = {
  async create(data: {
    snapshotId: string;
    competitorId: string;
    shareOfVoice: number;
    visibleVolume: number;
    rankedKeywords: number;
    avgPosition?: number;
    keywordRankings?: object;
  }) {
    return prisma.competitorMetrics.create({ data });
  },

  async findBySnapshot(snapshotId: string) {
    return prisma.competitorMetrics.findMany({
      where: { snapshotId },
      include: { competitor: true },
    });
  },
};

export default prisma;
