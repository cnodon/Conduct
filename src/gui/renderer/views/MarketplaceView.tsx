import React, { useEffect, useMemo, useRef, useState } from 'react';
import { invoke } from '@tauri-apps/api/tauri';
import type { SkillPlatform } from '../../../types/index.js';
import { useI18n } from '../i18n/useI18n';

interface MarketplaceSkill {
  name: string;
  description: string;
  author: string;
  stars: number;
  tags: string[];
  url: string;
}

interface AddRepoResult {
  skills: MarketplaceSkill[];
  addedRepo: string;
  addedSkills: number;
  totalSkills: number;
  totalRepos: number;
}

const theme = {
  bg: '#0c0a09',
  surface: '#1c1917',
  surfaceHover: '#292524',
  border: '#44403c',
  textSecondary: '#a8a29e',
  accent: '#f97316',
  accentHover: '#ea580c',
};

const iconPalette = ['#f97316', '#ef4444', '#f59e0b', '#ec4899', '#fb7185', '#f43f5e'];

const tagIconMap: Record<string, string> = {
  git: 'terminal',
  github: 'terminal',
  docker: 'inventory_2',
  sql: 'storage',
  db: 'storage',
  database: 'storage',
  refactor: 'tune',
  lint: 'check_circle',
  format: 'code',
  docs: 'description',
  test: 'science',
  build: 'construction',
  design: 'palette',
};

const getIconForSkill = (skill: MarketplaceSkill) => {
  const tag = skill.tags.find((item) => tagIconMap[item.toLowerCase()]);
  if (tag) {
    return { type: 'symbol' as const, value: tagIconMap[tag.toLowerCase()] };
  }
  return { type: 'symbol' as const, value: 'extension' };
};

const getAccentColor = (name: string) => {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) {
    hash = (hash + name.charCodeAt(i) * (i + 1)) % iconPalette.length;
  }
  return iconPalette[hash];
};

const getRepoKey = (url: string) => {
  if (url.startsWith('local:')) {
    const localPath = url.slice('local:'.length);
    const rootPath = localPath.split('#')[0] ?? localPath;
    return `local:${rootPath}`;
  }
  const treeIndex = url.indexOf('/tree/');
  if (treeIndex !== -1) {
    return url.slice(0, treeIndex);
  }
  return url;
};

const normalizeSkills = (data: unknown, labels: { untitled: string; unknownAuthor: string }): MarketplaceSkill[] => {
  if (!Array.isArray(data)) return [];
  return data
    .map((item) => {
      const raw = item as Partial<MarketplaceSkill>;
      return {
        name: raw.name ?? labels.untitled,
        description: raw.description ?? '',
        author: raw.author ?? labels.unknownAuthor,
        stars: typeof raw.stars === 'number' ? raw.stars : 0,
        tags: Array.isArray(raw.tags) ? raw.tags.filter((tag) => typeof tag === 'string') : [],
        url: raw.url ?? '',
      };
    })
    .filter((skill) => skill.url);
};

export const MarketplaceView: React.FC = () => {
  const { strings } = useI18n();
  const [skills, setSkills] = useState<MarketplaceSkill[]>([]);
  const [query, setQuery] = useState('');
  const [pageIndex, setPageIndex] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [installingUrl, setInstallingUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [installTarget, setInstallTarget] = useState<SkillPlatform>('claude');
  const [installModalSkill, setInstallModalSkill] = useState<MarketplaceSkill | null>(null);
  const [installedUrls, setInstalledUrls] = useState<Set<string>>(new Set());
  const [detailSkill, setDetailSkill] = useState<MarketplaceSkill | null>(null);
  const [syncActive, setSyncActive] = useState(false);
  const [syncStage, setSyncStage] = useState<'idle' | 'cache' | 'fetch' | 'merge' | 'done' | 'error'>('idle');
  const [syncDetail, setSyncDetail] = useState<string | null>(null);
  const [syncUpdatedAt, setSyncUpdatedAt] = useState<string | null>(null);
  const [showAddRepo, setShowAddRepo] = useState(false);
  const [repoUrl, setRepoUrl] = useState('');
  const [repoError, setRepoError] = useState<string | null>(null);
  const [repoAdding, setRepoAdding] = useState(false);
  const initialFetchTriggered = useRef(false);

  const pageSize = 18;

  const handleRefresh = () => {
    setError(null);
    setRefreshing(true);
    setSyncActive(true);
    setSyncStage('fetch');
    setSyncDetail(strings.marketplace.syncFetching);
    invoke<MarketplaceSkill[]>('fetch_marketplace_skills')
      .then((data) => {
        const normalized = normalizeSkills(data, strings.marketplace);
        setSkills(normalized);
        setPageIndex(0);
        setSyncStage('merge');
        setSyncDetail(strings.marketplace.syncUpdated(normalized.length));
        setSyncStage('done');
        setSyncDetail(strings.marketplace.syncUpdated(normalized.length));
        setSyncUpdatedAt(new Date().toLocaleTimeString());
        setSyncActive(false);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : strings.marketplace.errorRefresh);
        setSyncStage('error');
        setSyncDetail(strings.marketplace.syncFailed);
        setSyncActive(false);
      })
      .finally(() => {
        setRefreshing(false);
      });
  };

  const handleAddRepo = () => {
    const trimmed = repoUrl.trim();
    if (!trimmed) {
      setRepoError(strings.marketplace.addRepoRequired);
      return;
    }
    let isHttpUrl = false;
    try {
      const url = new URL(trimmed);
      isHttpUrl = url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
      isHttpUrl = false;
    }

    const isGitSsh = /^git@/i.test(trimmed);
    if (!isHttpUrl && !isGitSsh) {
      setRepoError(strings.marketplace.addRepoInvalid);
      return;
    }

    setRepoError(null);
    setRepoAdding(true);
    setSyncActive(true);
    setSyncStage('fetch');
    setSyncDetail(strings.marketplace.syncAddingRepo);

    invoke<AddRepoResult>('add_skills_repo', { url: trimmed })
      .then((result) => {
        const normalized = normalizeSkills(result.skills, strings.marketplace);
        setSkills(normalized);
        setPageIndex(0);
        setSyncStage('merge');
        setSyncDetail(strings.marketplace.syncRepoAdded(result.addedRepo, result.addedSkills));
        setSyncUpdatedAt(new Date().toLocaleTimeString());
        setSyncStage('done');
        setSyncActive(false);
        setShowAddRepo(false);
        setRepoUrl('');
      })
      .catch((err) => {
        setRepoError(err instanceof Error ? err.message : strings.marketplace.addRepoFailed);
        setSyncStage('error');
        setSyncDetail(strings.marketplace.syncFailed);
        setSyncActive(false);
      })
      .finally(() => {
        setRepoAdding(false);
      });
  };

  useEffect(() => {
    let mounted = true;

    setSyncActive(true);
    setSyncStage('cache');
    setSyncDetail(strings.marketplace.syncReadingCache);
    invoke<MarketplaceSkill[]>('read_marketplace_cache')
      .then((data) => {
        if (!mounted) return;
        const normalized = normalizeSkills(data, strings.marketplace);
        if (normalized.length > 0) {
          setSkills(normalized);
          setSyncDetail(strings.marketplace.syncCacheLoaded(normalized.length));
          setSyncStage('idle');
          setSyncActive(false);
          return;
        }
        if (!initialFetchTriggered.current) {
          initialFetchTriggered.current = true;
          handleRefresh();
        } else {
          setSyncStage('idle');
          setSyncActive(false);
        }
      })
      .catch((err) => {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : strings.marketplace.errorReadCache);
        setSyncStage('error');
        setSyncDetail(strings.marketplace.syncFailed);
        setSyncActive(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    setPageIndex(0);
  }, [query]);

  const filteredSkills = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return skills;
    return skills.filter((skill) => {
      const haystack = [
        skill.name,
        skill.description,
        skill.author,
        skill.tags.join(' '),
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(needle);
    });
  }, [query, skills]);

  const repoCount = useMemo(() => {
    const repos = new Set<string>();
    skills.forEach((skill) => {
      if (skill.url) {
        repos.add(getRepoKey(skill.url));
      }
    });
    return repos.size;
  }, [skills]);

  const totalCount = filteredSkills.length;
  const pageCount = Math.max(1, Math.ceil(totalCount / pageSize));
  const currentPageIndex = Math.min(pageIndex, Math.max(0, pageCount - 1));
  const currentPage = currentPageIndex + 1;
  const startIndex = currentPageIndex * pageSize;
  const pagedSkills = filteredSkills.slice(startIndex, startIndex + pageSize);
  const showingCount = pagedSkills.length;
  const paginationProgress = totalCount > 0 ? Math.min(100, (currentPage / pageCount) * 100) : 0;

  useEffect(() => {
    if (currentPageIndex !== pageIndex) {
      setPageIndex(currentPageIndex);
    }
  }, [currentPageIndex, pageIndex]);

  const pageItems = useMemo(() => {
    if (pageCount <= 7) {
      return Array.from({ length: pageCount }, (_, index) => index + 1);
    }
    if (currentPage <= 4) {
      return [1, 2, 3, 4, 5, 'ellipsis', pageCount];
    }
    if (currentPage >= pageCount - 3) {
      return [1, 'ellipsis', pageCount - 4, pageCount - 3, pageCount - 2, pageCount - 1, pageCount];
    }
    return [1, 'ellipsis', currentPage - 1, currentPage, currentPage + 1, 'ellipsis', pageCount];
  }, [currentPage, pageCount]);

  const syncProgress = syncStage === 'cache'
    ? 28
    : syncStage === 'fetch'
      ? 64
      : syncStage === 'merge'
        ? 88
        : syncStage === 'done'
          ? 100
          : 0;

  const handleInstall = async () => {
    if (!installModalSkill) return;
    setInstallingUrl(installModalSkill.url);
    setError(null);
    try {
      await invoke('install_skill', { platform: installTarget, url: installModalSkill.url });
      setInstalledUrls((prev) => {
        const next = new Set(prev);
        next.add(installModalSkill.url);
        return next;
      });
      setInstallModalSkill(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : strings.marketplace.errorInstall);
    } finally {
      setInstallingUrl(null);
    }
  };

  return (
    <div className="marketplace-view">
      <div className="marketplace-scroll">
        <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '32px 32px 80px' }}>
          <header style={{ marginBottom: '16px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px' }}>
            <div>
              <h2 style={{ fontSize: '32px', fontWeight: 800, color: 'white' }}>{strings.marketplace.title}</h2>
              <div style={{ marginTop: '6px', fontSize: '13px', color: theme.textSecondary }}>
                {strings.marketplace.summary(skills.length, repoCount)}
              </div>
            </div>
            <div className="marketplace-sync-panel">
              <div className="marketplace-sync-status">
                <span
                  className={`marketplace-sync-dot ${syncActive ? 'is-active' : ''} ${syncStage === 'error' ? 'is-error' : ''}`}
                />
                <span>
                  {syncStage === 'error'
                    ? strings.marketplace.syncStageError
                    : syncStage === 'done'
                      ? strings.marketplace.syncStageDone
                      : syncStage === 'fetch'
                        ? strings.marketplace.syncStageFetch
                        : syncStage === 'merge'
                          ? strings.marketplace.syncStageMerge
                          : syncStage === 'cache'
                            ? strings.marketplace.syncStageCache
                            : strings.marketplace.syncStageIdle}
                </span>
                {syncDetail && (
                  <span className="marketplace-sync-detail">{syncDetail}</span>
                )}
                {syncUpdatedAt && !syncActive && (
                  <span className="marketplace-sync-time">{strings.marketplace.syncUpdatedAt(syncUpdatedAt)}</span>
                )}
              </div>
              <div className="marketplace-sync-actions">
                <button
                  className="marketplace-sync-button"
                  onClick={handleRefresh}
                  disabled={refreshing}
                >
                  {refreshing ? strings.marketplace.syncButtonUpdating : strings.marketplace.syncButton}
                </button>
                <button
                  className="marketplace-sync-button secondary"
                  onClick={() => {
                    setRepoError(null);
                    setShowAddRepo(true);
                  }}
                  disabled={repoAdding}
                >
                  {strings.marketplace.addRepo}
                </button>
              </div>
            </div>
          </header>

          <div className="marketplace-sticky">
            {syncActive && (
              <div className="marketplace-sync-bar">
                <span style={{ width: `${syncProgress}%` }} />
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ position: 'relative' }}>
                <span
                  className="material-symbols-outlined"
                  style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: theme.textSecondary }}
                >
                  search
                </span>
                <input
                  type="text"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={strings.marketplace.searchPlaceholder}
                  style={{
                    width: '100%',
                    padding: '10px 12px 10px 40px',
                    borderRadius: '10px',
                    border: `1px solid ${theme.border}`,
                    background: theme.surface,
                    color: 'white',
                    outline: 'none',
                    fontSize: '14px',
                    boxShadow: '0 8px 16px rgba(0,0,0,0.2)',
                  }}
                />
              </div>

              <div className="marketplace-columns">
                <div style={{ width: '54px' }} />
                <div style={{ width: '220px', color: theme.textSecondary, fontSize: '12px', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600 }}>
                  {strings.marketplace.columnName}
                </div>
                <div style={{ flex: 1, color: theme.textSecondary, fontSize: '12px', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600 }}>
                  {strings.marketplace.columnDescription}
                </div>
                <div style={{ width: '120px' }} />
              </div>
            </div>
          </div>

          {error && (
            <div style={{
              marginTop: '16px',
              padding: '10px 12px',
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '10px',
              color: '#fca5a5',
              fontSize: '13px',
            }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px' }}>
            {refreshing && skills.length === 0 && (
              <div className="marketplace-skeleton">
                {[0, 1, 2, 3].map((index) => (
                  <div key={`skeleton-${index}`} className="marketplace-skeleton-row">
                    <div className="marketplace-skeleton-icon" />
                    <div className="marketplace-skeleton-content">
                      <div className="marketplace-skeleton-line short" />
                      <div className="marketplace-skeleton-line" />
                    </div>
                    <div className="marketplace-skeleton-pill" />
                  </div>
                ))}
              </div>
            )}

            {!refreshing && filteredSkills.length === 0 && (
              <div style={{ color: theme.textSecondary, fontSize: '14px', padding: '24px 12px' }}>
                {strings.marketplace.noMatch}
              </div>
            )}

            {pagedSkills.map((skill, index) => {
              const icon = getIconForSkill(skill);
              const accent = getAccentColor(skill.name);
              const isLocal = skill.url.startsWith('local:');
              const isInstalled = installedUrls.has(skill.url);
              const isInstalling = installingUrl === skill.url;
              const isOfficial = !isLocal && skill.url.includes('anthropics/skills');
              const rowBorder = isInstalled ? 'rgba(249, 115, 22, 0.5)' : theme.border;
              const rowShadow = isInstalled
                ? '0 0 0 1px rgba(249, 115, 22, 0.2), 0 10px 20px rgba(0,0,0,0.2)'
                : '0 10px 20px rgba(0,0,0,0.2)';
              const isInstallDisabled = isLocal || isInstalled || isInstalling;
              return (
                <div
                  key={skill.url}
                  className="marketplace-row marketplace-row-animated"
                  onClick={() => setDetailSkill(skill)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    padding: '12px',
                    borderRadius: '14px',
                    background: theme.surface,
                    border: `1px solid ${rowBorder}`,
                    boxShadow: rowShadow,
                    position: 'relative',
                    cursor: 'pointer',
                    animationDelay: `${index * 24}ms`,
                  }}
                >
                  {isInstalled && (
                    <div style={{
                      position: 'absolute',
                      left: 0,
                      top: 0,
                      bottom: 0,
                      width: '3px',
                      background: theme.accent,
                      borderRadius: '14px 0 0 14px',
                    }} />
                  )}
                  <div
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '10px',
                      background: accent,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      flexShrink: 0,
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>{icon.value}</span>
                  </div>

                  <div className="marketplace-name" style={{ width: '220px', display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <div style={{ fontWeight: 700, color: 'white', fontSize: '14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {skill.name}
                      </div>
                      {isOfficial && (
                        <span className="material-symbols-outlined" style={{ fontSize: '16px', color: theme.accent }}>
                          verified
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '12px', color: theme.textSecondary }}>
                      {strings.marketplace.byAuthor(skill.author.startsWith('@') ? skill.author : `@${skill.author}`)}
                    </div>
                  </div>

                  <div className="marketplace-description" style={{ flex: 1, minWidth: '0', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ fontSize: '13px', color: '#d6d3d1', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {skill.description}
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {skill.tags.slice(0, 4).map((tag) => (
                        <span
                          key={`${skill.url}-${tag}`}
                          style={{
                            fontSize: '11px',
                            padding: '2px 8px',
                            borderRadius: '999px',
                            border: `1px solid ${theme.border}`,
                            color: theme.textSecondary,
                          }}
                        >
                          {tag}
                        </span>
                      ))}
                      {skill.stars > 0 && (
                        <span style={{
                          fontSize: '11px',
                          padding: '2px 8px',
                          borderRadius: '999px',
                          border: `1px solid ${theme.border}`,
                          color: theme.textSecondary,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}>
                          <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>star</span>
                          {skill.stars}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="marketplace-actions">
                    <button
                      onClick={() => {
                        if (isInstallDisabled) return;
                        setInstallTarget('claude');
                        setInstallModalSkill(skill);
                      }}
                      disabled={isInstallDisabled}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '10px',
                        border: isInstallDisabled ? `1px solid ${theme.border}` : '1px solid transparent',
                        background: isInstallDisabled ? theme.surfaceHover : theme.accent,
                        color: 'white',
                        fontSize: '12px',
                        fontWeight: 700,
                        cursor: isInstallDisabled ? 'default' : 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        opacity: isInstalling ? 0.7 : 1,
                      }}
                      onMouseEnter={(event) => {
                        if (!isInstallDisabled) event.currentTarget.style.background = theme.accentHover;
                      }}
                      onMouseLeave={(event) => {
                        if (!isInstallDisabled) event.currentTarget.style.background = theme.accent;
                      }}
                    >
                      {isLocal
                        ? strings.marketplace.local
                        : isInstalled
                          ? strings.marketplace.installed
                          : isInstalling
                            ? strings.marketplace.installing
                            : strings.marketplace.install}
                      <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                        {isLocal ? 'folder' : isInstalled ? 'check' : 'download'}
                      </span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="marketplace-pagination">
            <div className="marketplace-pagination-info">
              <span>{strings.marketplace.paginationStatus(showingCount, totalCount, currentPage, pageCount)}</span>
              <div className="marketplace-pagination-bar">
                <span style={{ width: `${paginationProgress}%` }} />
              </div>
            </div>
            <div className="marketplace-pagination-actions">
              <div className="marketplace-pagination-nav">
                <button
                  className="marketplace-page-button ghost"
                  onClick={() => setPageIndex(Math.max(0, currentPageIndex - 1))}
                  disabled={currentPageIndex === 0}
                >
                  <span className="material-symbols-outlined">chevron_left</span>
                  <span className="label">{strings.marketplace.pagePrev}</span>
                </button>
                <div className="marketplace-page-list">
                  {pageItems.map((item, index) => (
                    item === 'ellipsis'
                      ? (
                        <span key={`ellipsis-${index}`} className="marketplace-page-ellipsis">…</span>
                      ) : (
                        <button
                          key={`page-${item}`}
                          className={`marketplace-page-button ${item === currentPage ? 'active' : ''}`}
                          onClick={() => setPageIndex((item as number) - 1)}
                        >
                          {item}
                        </button>
                      )
                  ))}
                </div>
                <button
                  className="marketplace-page-button ghost"
                  onClick={() => setPageIndex(Math.min(pageCount - 1, currentPageIndex + 1))}
                  disabled={currentPageIndex >= pageCount - 1}
                >
                  <span className="label">{strings.marketplace.pageNext}</span>
                  <span className="material-symbols-outlined">chevron_right</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showAddRepo && (
        <div className="marketplace-modal">
          <div className="marketplace-modal-card" style={{ width: '420px' }}>
            <h3 style={{ marginTop: 0, color: 'white', fontFamily: 'Space Grotesk' }}>
              {strings.marketplace.addRepoTitle}
            </h3>
            <p style={{ color: '#94a3b8', fontSize: '14px' }}>
              {strings.marketplace.addRepoDescription}
            </p>
            <input
              type="text"
              value={repoUrl}
              onChange={(event) => setRepoUrl(event.target.value)}
              placeholder={strings.marketplace.addRepoPlaceholder}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '10px',
                border: '1px solid rgba(148, 163, 184, 0.3)',
                background: 'rgba(15, 23, 42, 0.4)',
                color: 'white',
                outline: 'none',
                fontSize: '13px',
              }}
            />
            {repoError && (
              <div style={{ marginTop: '8px', color: '#fca5a5', fontSize: '12px' }}>
                {repoError}
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '18px' }}>
              <button
                onClick={() => setShowAddRepo(false)}
                style={{
                  padding: '8px 16px',
                  background: 'transparent',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: '#94a3b8',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
              >
                {strings.marketplace.cancel}
              </button>
              <button
                onClick={handleAddRepo}
                disabled={repoAdding}
                style={{
                  padding: '8px 16px',
                  background: 'var(--primary)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: repoAdding ? 'not-allowed' : 'pointer',
                  opacity: repoAdding ? 0.7 : 1
                }}
              >
                {repoAdding ? strings.marketplace.addRepoAdding : strings.marketplace.addRepoConfirm}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Skill Detail Slide-over Panel */}
      {detailSkill && (
        <div
          className="skill-detail-overlay"
          onClick={() => setDetailSkill(null)}
        >
          <div
            className="skill-detail-panel"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              className="skill-detail-close"
              onClick={() => setDetailSkill(null)}
            >
              <span className="material-symbols-outlined">close</span>
            </button>

            {/* Header with Icon */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', marginBottom: '24px' }}>
              <div
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '14px',
                  background: getAccentColor(detailSkill.name),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  flexShrink: 0,
                  boxShadow: '0 8px 20px rgba(0,0,0,0.3)',
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '28px' }}>
                  {getIconForSkill(detailSkill).value}
                </span>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <h2 style={{ margin: 0, fontSize: '22px', fontWeight: 800, color: 'white' }}>
                    {detailSkill.name}
                  </h2>
                  {detailSkill.url.includes('anthropics/skills') && (
                    <span className="material-symbols-outlined" style={{ fontSize: '20px', color: theme.accent }}>
                      verified
                    </span>
                  )}
                </div>
                <p style={{ margin: '6px 0 0', fontSize: '14px', color: theme.textSecondary }}>
                  {strings.marketplace.byAuthor(detailSkill.author.startsWith('@') ? detailSkill.author : `@${detailSkill.author}`)}
                </p>
              </div>
            </div>

            {/* Description */}
            <div style={{ marginBottom: '20px' }}>
              <h3 style={{ margin: '0 0 8px', fontSize: '13px', fontWeight: 600, color: theme.textSecondary, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {strings.marketplace.description}
              </h3>
              <p style={{ margin: 0, fontSize: '14px', lineHeight: 1.6, color: '#e7e5e4' }}>
                {detailSkill.description}
              </p>
            </div>

            {/* Tags */}
            {detailSkill.tags.length > 0 && (
              <div style={{ marginBottom: '20px' }}>
                <h3 style={{ margin: '0 0 10px', fontSize: '13px', fontWeight: 600, color: theme.textSecondary, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {strings.marketplace.tags}
                </h3>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {detailSkill.tags.map((tag) => (
                    <span
                      key={tag}
                      style={{
                        fontSize: '12px',
                        padding: '4px 12px',
                        borderRadius: '999px',
                        background: 'rgba(249, 115, 22, 0.12)',
                        border: `1px solid rgba(249, 115, 22, 0.3)`,
                        color: theme.accent,
                      }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Stats */}
            <div style={{ display: 'flex', gap: '16px', marginBottom: '20px' }}>
              {detailSkill.stars > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: theme.textSecondary, fontSize: '14px' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#fbbf24' }}>star</span>
                  <span>{detailSkill.stars} {strings.marketplace.starsLabel}</span>
                </div>
              )}
            </div>

            {/* URL */}
            <div style={{ marginBottom: '28px' }}>
              <h3 style={{ margin: '0 0 8px', fontSize: '13px', fontWeight: 600, color: theme.textSecondary, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {strings.marketplace.repository}
              </h3>
              <a
                href={detailSkill.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '13px',
                  color: theme.accent,
                  textDecoration: 'none',
                  wordBreak: 'break-all',
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>open_in_new</span>
                {detailSkill.url}
              </a>
            </div>

            {/* Install Button */}
            <button
              onClick={() => {
                const isLocal = detailSkill.url.startsWith('local:');
                const isInstalled = installedUrls.has(detailSkill.url);
                if (isLocal || isInstalled) return;
                setInstallTarget('claude');
                setInstallModalSkill(detailSkill);
              }}
              disabled={detailSkill.url.startsWith('local:') || installedUrls.has(detailSkill.url)}
              style={{
                width: '100%',
                padding: '14px 20px',
                borderRadius: '12px',
                border: 'none',
                background: installedUrls.has(detailSkill.url)
                  ? theme.surfaceHover
                  : `linear-gradient(135deg, ${theme.accent} 0%, ${theme.accentHover} 100%)`,
                color: 'white',
                fontSize: '15px',
                fontWeight: 700,
                cursor: installedUrls.has(detailSkill.url) ? 'default' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: installedUrls.has(detailSkill.url)
                  ? 'none'
                  : '0 8px 24px rgba(249, 115, 22, 0.3)',
                transition: 'transform 0.2s, box-shadow 0.2s',
              }}
              onMouseEnter={(e) => {
                if (!installedUrls.has(detailSkill.url)) {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 12px 28px rgba(249, 115, 22, 0.4)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                if (!installedUrls.has(detailSkill.url)) {
                  e.currentTarget.style.boxShadow = '0 8px 24px rgba(249, 115, 22, 0.3)';
                }
              }}
            >
              {detailSkill.url.startsWith('local:') ? (
                <>
                  <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>folder</span>
                  {strings.marketplace.localSkill}
                </>
              ) : installedUrls.has(detailSkill.url) ? (
                <>
                  <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>check_circle</span>
                  {strings.marketplace.installed}
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>download</span>
                  {strings.marketplace.installButton}
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {installModalSkill && (
        <div className="marketplace-modal">
          <div className="marketplace-modal-card">
            <h3 style={{ margin: 0, fontSize: '18px', color: 'white' }}>{strings.marketplace.installModalTitle}</h3>
            <p style={{ margin: '6px 0 16px', color: theme.textSecondary, fontSize: '13px' }}>
              {strings.marketplace.installModalDescription(installModalSkill.name)}
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {(['claude', 'codex', 'gemini'] as SkillPlatform[]).map((platform) => (
                <label key={platform} style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 12px',
                  borderRadius: '10px',
                  border: `1px solid ${installTarget === platform ? theme.accent : theme.border}`,
                  background: installTarget === platform ? 'rgba(249, 115, 22, 0.12)' : theme.surface,
                  cursor: 'pointer',
                }}>
                  <span style={{ color: 'white', fontSize: '14px', fontWeight: 600 }}>
                    {platform === 'claude'
                      ? strings.platform.claude
                      : platform === 'codex'
                        ? strings.platform.codex
                        : strings.platform.gemini}
                  </span>
                  <input
                    type="radio"
                    name="platform"
                    checked={installTarget === platform}
                    onChange={() => setInstallTarget(platform)}
                    style={{ accentColor: theme.accent }}
                  />
                </label>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '20px' }}>
              <button
                onClick={() => setInstallModalSkill(null)}
                style={{
                  padding: '8px 14px',
                  borderRadius: '8px',
                  border: `1px solid ${theme.border}`,
                  background: 'transparent',
                  color: theme.textSecondary,
                  cursor: 'pointer',
                }}
              >
                {strings.marketplace.cancel}
              </button>
              <button
                onClick={handleInstall}
                disabled={installingUrl === installModalSkill.url}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: '1px solid transparent',
                  background: theme.accent,
                  color: 'white',
                  fontWeight: 700,
                  cursor: installingUrl === installModalSkill.url ? 'not-allowed' : 'pointer',
                  opacity: installingUrl === installModalSkill.url ? 0.7 : 1,
                }}
              >
                {installingUrl === installModalSkill.url ? strings.marketplace.installing : strings.marketplace.install}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
