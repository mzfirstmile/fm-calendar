/* ============================================================
   Active Initiatives Module — initiatives.js
   External IIFE module (same pattern as exec-v2.js)
   Loaded via <script src="initiatives.js"> in index.html
   Called via window.initiativesInit() from switchView()
   ============================================================ */
(function () {
  'use strict';

  let _inited = false;
  let _initiatives = [];
  let _entries = [];
  let _members = [];
  let _currentInitiative = null; // detail view
  let _currentUser = null;

  // ── CSS ──────────────────────────────────────────────────
  function _injectCSS() {
    if (document.getElementById('init-css')) return;
    const style = document.createElement('style');
    style.id = 'init-css';
    style.textContent = `
      /* ── Card Grid ─────────────────────────── */
      #initRoot .init-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
        gap: 20px;
        margin-top: 20px;
      }
      #initRoot .init-card {
        background: #fff;
        border: 1px solid #e2e8f0;
        border-radius: 12px;
        padding: 24px;
        cursor: pointer;
        transition: box-shadow .2s, border-color .2s;
        position: relative;
      }
      #initRoot .init-card:hover {
        box-shadow: 0 4px 16px rgba(0,0,0,.08);
        border-color: #0ea5e9;
      }
      #initRoot .init-card-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 12px;
      }
      #initRoot .init-card-title {
        font-size: 17px;
        font-weight: 600;
        color: #1e293b;
        margin: 0;
        border-bottom: none;
        padding: 0;
      }
      #initRoot .init-status {
        font-size: 11px;
        font-weight: 600;
        padding: 3px 10px;
        border-radius: 20px;
        text-transform: uppercase;
        letter-spacing: .5px;
        white-space: nowrap;
      }
      #initRoot .init-status.active   { background: #dcfce7; color: #166534; }
      #initRoot .init-status.on_hold  { background: #fef3c7; color: #92400e; }
      #initRoot .init-status.completed{ background: #dbeafe; color: #1e40af; }
      #initRoot .init-status.archived { background: #f1f5f9; color: #64748b; }

      #initRoot .init-card-summary {
        font-size: 13px;
        color: #64748b;
        line-height: 1.5;
        margin-bottom: 16px;
        display: -webkit-box;
        -webkit-line-clamp: 3;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }
      #initRoot .init-card-meta {
        display: flex;
        gap: 16px;
        font-size: 12px;
        color: #94a3b8;
      }
      #initRoot .init-card-meta span { display: flex; align-items: center; gap: 4px; }

      /* ── Header Bar ────────────────────────── */
      #initRoot .init-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 8px;
      }
      #initRoot .init-header h2 {
        font-size: 22px;
        font-weight: 600;
        color: #1e293b;
        margin: 0;
      }
      #initRoot .init-filters {
        display: flex;
        gap: 8px;
        align-items: center;
      }
      #initRoot .init-filter-btn {
        padding: 6px 14px;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        background: #fff;
        font-size: 13px;
        cursor: pointer;
        color: #64748b;
        transition: all .15s;
      }
      #initRoot .init-filter-btn.active,
      #initRoot .init-filter-btn:hover {
        background: #0ea5e9;
        color: #fff;
        border-color: #0ea5e9;
      }
      #initRoot .init-add-btn {
        padding: 8px 18px;
        background: #0ea5e9;
        color: #fff;
        border: none;
        border-radius: 8px;
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 6px;
        transition: background .15s;
      }
      #initRoot .init-add-btn:hover { background: #0284c7; }

      /* ── Detail View ───────────────────────── */
      #initRoot .init-detail { display: none; }
      #initRoot .init-detail.show { display: block; }
      #initRoot .init-list.hidden { display: none; }

      #initRoot .init-back {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        font-size: 13px;
        color: #64748b;
        cursor: pointer;
        margin-bottom: 16px;
        padding: 4px 0;
        border: none;
        background: none;
        transition: color .15s;
      }
      #initRoot .init-back:hover { color: #0ea5e9; }

      #initRoot .init-detail-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 24px;
      }
      #initRoot .init-detail-title {
        font-size: 24px;
        font-weight: 700;
        color: #1e293b;
        margin: 0 0 6px 0;
        border-bottom: none;
        padding: 0;
      }
      #initRoot .init-detail-summary {
        font-size: 14px;
        color: #64748b;
        line-height: 1.6;
        max-width: 700px;
      }
      #initRoot .init-detail-actions {
        display: flex;
        gap: 8px;
      }
      #initRoot .init-detail-actions button {
        padding: 8px 16px;
        border-radius: 8px;
        font-size: 13px;
        font-weight: 500;
        cursor: pointer;
        transition: all .15s;
      }
      #initRoot .init-btn-outline {
        background: #fff;
        border: 1px solid #e2e8f0;
        color: #475569;
      }
      #initRoot .init-btn-outline:hover { border-color: #0ea5e9; color: #0ea5e9; }
      #initRoot .init-btn-primary {
        background: #0ea5e9;
        border: 1px solid #0ea5e9;
        color: #fff;
      }
      #initRoot .init-btn-primary:hover { background: #0284c7; }

      /* ── Tabs ───────────────────────────────── */
      #initRoot .init-tabs {
        display: flex;
        gap: 0;
        border-bottom: 2px solid #e2e8f0;
        margin-bottom: 24px;
      }
      #initRoot .init-tab {
        padding: 10px 20px;
        font-size: 13px;
        font-weight: 600;
        color: #94a3b8;
        cursor: pointer;
        border-bottom: 2px solid transparent;
        margin-bottom: -2px;
        transition: all .15s;
        background: none;
        border-top: none;
        border-left: none;
        border-right: none;
      }
      #initRoot .init-tab.active {
        color: #0ea5e9;
        border-bottom-color: #0ea5e9;
      }
      #initRoot .init-tab:hover:not(.active) { color: #475569; }

      #initRoot .init-tab-panel { display: none; }
      #initRoot .init-tab-panel.show { display: block; }

      /* ── Activity Timeline ─────────────────── */
      #initRoot .init-timeline {
        position: relative;
        padding-left: 32px;
      }
      #initRoot .init-timeline::before {
        content: '';
        position: absolute;
        left: 11px;
        top: 0;
        bottom: 0;
        width: 2px;
        background: #e2e8f0;
      }
      #initRoot .init-entry {
        position: relative;
        margin-bottom: 20px;
        background: #fff;
        border: 1px solid #e2e8f0;
        border-radius: 10px;
        padding: 16px 20px;
      }
      #initRoot .init-entry::before {
        content: '';
        position: absolute;
        left: -25px;
        top: 20px;
        width: 10px;
        height: 10px;
        border-radius: 50%;
        border: 2px solid #fff;
        box-shadow: 0 0 0 2px #e2e8f0;
      }
      #initRoot .init-entry.type-email::before    { background: #3b82f6; box-shadow: 0 0 0 2px #93c5fd; }
      #initRoot .init-entry.type-note::before     { background: #8b5cf6; box-shadow: 0 0 0 2px #c4b5fd; }
      #initRoot .init-entry.type-milestone::before { background: #f59e0b; box-shadow: 0 0 0 2px #fcd34d; }
      #initRoot .init-entry.type-document::before  { background: #10b981; box-shadow: 0 0 0 2px #6ee7b7; }
      #initRoot .init-entry.type-task::before      { background: #ef4444; box-shadow: 0 0 0 2px #fca5a5; }

      #initRoot .init-entry-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 8px;
      }
      #initRoot .init-entry-type {
        font-size: 10px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: .8px;
        padding: 2px 8px;
        border-radius: 4px;
      }
      .type-email .init-entry-type    { background: #dbeafe; color: #1d4ed8; }
      .type-note .init-entry-type     { background: #ede9fe; color: #6d28d9; }
      .type-milestone .init-entry-type{ background: #fef3c7; color: #92400e; }
      .type-document .init-entry-type { background: #d1fae5; color: #065f46; }
      .type-task .init-entry-type     { background: #fee2e2; color: #991b1b; }

      #initRoot .init-entry-date {
        font-size: 12px;
        color: #94a3b8;
      }
      #initRoot .init-entry-title {
        font-size: 14px;
        font-weight: 600;
        color: #1e293b;
        margin-bottom: 6px;
      }
      #initRoot .init-entry-content {
        font-size: 13px;
        color: #475569;
        line-height: 1.6;
        white-space: pre-wrap;
      }
      #initRoot .init-entry-meta {
        font-size: 12px;
        color: #94a3b8;
        margin-top: 8px;
      }
      #initRoot .init-entry .pin-badge {
        position: absolute;
        top: -6px;
        right: 12px;
        background: #f59e0b;
        color: #fff;
        font-size: 9px;
        padding: 2px 6px;
        border-radius: 4px;
        font-weight: 700;
      }

      /* ── Milestones ────────────────────────── */
      #initRoot .init-milestones {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }
      #initRoot .init-milestone-row {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 14px 18px;
        background: #fff;
        border: 1px solid #e2e8f0;
        border-radius: 10px;
      }
      #initRoot .init-milestone-check {
        width: 22px;
        height: 22px;
        border-radius: 50%;
        border: 2px solid #cbd5e1;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        flex-shrink: 0;
        transition: all .15s;
      }
      #initRoot .init-milestone-check.done {
        background: #10b981;
        border-color: #10b981;
        color: #fff;
      }
      #initRoot .init-milestone-info { flex: 1; }
      #initRoot .init-milestone-title {
        font-size: 14px;
        font-weight: 600;
        color: #1e293b;
      }
      #initRoot .init-milestone-title.done { text-decoration: line-through; color: #94a3b8; }
      #initRoot .init-milestone-due {
        font-size: 12px;
        color: #94a3b8;
        margin-top: 2px;
      }

      /* ── Team Panel ────────────────────────── */
      #initRoot .init-team-list {
        display: flex;
        flex-direction: column;
        gap: 10px;
      }
      #initRoot .init-team-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 12px 16px;
        background: #fff;
        border: 1px solid #e2e8f0;
        border-radius: 10px;
      }
      #initRoot .init-team-person {
        display: flex;
        align-items: center;
        gap: 10px;
      }
      #initRoot .init-team-avatar {
        width: 34px;
        height: 34px;
        border-radius: 50%;
        background: #0ea5e9;
        color: #fff;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 13px;
        font-weight: 700;
        flex-shrink: 0;
      }
      #initRoot .init-team-name {
        font-size: 14px;
        font-weight: 600;
        color: #1e293b;
      }
      #initRoot .init-team-email {
        font-size: 12px;
        color: #94a3b8;
      }
      #initRoot .init-team-role {
        font-size: 11px;
        font-weight: 600;
        padding: 3px 10px;
        border-radius: 20px;
        text-transform: uppercase;
        letter-spacing: .5px;
      }
      #initRoot .init-team-role.owner  { background: #fef3c7; color: #92400e; }
      #initRoot .init-team-role.member { background: #dbeafe; color: #1e40af; }
      #initRoot .init-team-role.viewer { background: #f1f5f9; color: #64748b; }

      /* ── Modal ──────────────────────────────── */
      #initRoot .init-modal-overlay {
        position: fixed;
        inset: 0;
        background: rgba(0,0,0,.4);
        z-index: 9999;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      #initRoot .init-modal {
        background: #fff;
        border-radius: 14px;
        padding: 28px 32px;
        width: 520px;
        max-width: 90vw;
        max-height: 80vh;
        overflow-y: auto;
        box-shadow: 0 20px 40px rgba(0,0,0,.15);
      }
      #initRoot .init-modal h3 {
        font-size: 18px;
        font-weight: 700;
        color: #1e293b;
        margin: 0 0 20px 0;
      }
      #initRoot .init-modal label {
        font-size: 13px;
        font-weight: 600;
        color: #475569;
        display: block;
        margin-bottom: 6px;
      }
      #initRoot .init-modal input,
      #initRoot .init-modal textarea,
      #initRoot .init-modal select {
        width: 100%;
        padding: 10px 12px;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        font-size: 14px;
        margin-bottom: 16px;
        font-family: inherit;
        box-sizing: border-box;
      }
      #initRoot .init-modal textarea { min-height: 100px; resize: vertical; }
      #initRoot .init-modal-actions {
        display: flex;
        justify-content: flex-end;
        gap: 10px;
        margin-top: 8px;
      }

      /* ── Empty state ────────────────────────── */
      #initRoot .init-empty {
        text-align: center;
        padding: 60px 20px;
        color: #94a3b8;
      }
      #initRoot .init-empty-icon {
        font-size: 48px;
        margin-bottom: 12px;
      }
      #initRoot .init-empty h3 {
        font-size: 18px;
        color: #475569;
        margin: 0 0 8px 0;
      }
      #initRoot .init-empty p {
        font-size: 14px;
        max-width: 400px;
        margin: 0 auto;
      }

      /* ── Misc ───────────────────────────────── */
      #initRoot .init-count-badge {
        font-size: 12px;
        background: #f1f5f9;
        color: #64748b;
        padding: 2px 8px;
        border-radius: 10px;
        margin-left: 6px;
      }
    `;
    document.head.appendChild(style);
  }

  // ── HTML skeleton ────────────────────────────────────────
  function _injectHTML() {
    const root = document.getElementById('initRoot');
    if (!root) return;
    root.innerHTML = `
      <!-- List View -->
      <div class="init-list" id="initListView">
        <div class="init-header">
          <div>
            <h2>Active Initiatives</h2>
            <p style="font-size:13px;color:#94a3b8;margin:4px 0 0 0">Track projects, communications, and milestones</p>
          </div>
          <div style="display:flex;gap:10px;align-items:center;">
            <div class="init-filters" id="initFilters">
              <button class="init-filter-btn active" data-filter="all">All</button>
              <button class="init-filter-btn" data-filter="active">Active</button>
              <button class="init-filter-btn" data-filter="on_hold">On Hold</button>
              <button class="init-filter-btn" data-filter="completed">Completed</button>
            </div>
            <button class="init-add-btn" onclick="initNewProject()">+ New Initiative</button>
          </div>
        </div>
        <div class="init-grid" id="initGrid"></div>
      </div>

      <!-- Detail View -->
      <div class="init-detail" id="initDetailView">
        <button class="init-back" onclick="initBackToList()">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>
          Back to Initiatives
        </button>
        <div class="init-detail-header">
          <div>
            <h2 class="init-detail-title" id="initDetailTitle"></h2>
            <p class="init-detail-summary" id="initDetailSummary"></p>
          </div>
          <div class="init-detail-actions">
            <button class="init-btn-outline" onclick="initEditProject()">Edit</button>
            <button class="init-btn-primary" onclick="initAddEntry()">+ Add Entry</button>
          </div>
        </div>

        <div class="init-tabs" id="initTabs">
          <button class="init-tab active" data-tab="activity">Activity</button>
          <button class="init-tab" data-tab="milestones">Milestones</button>
          <button class="init-tab" data-tab="team">Team</button>
        </div>

        <div class="init-tab-panel show" id="initPanelActivity">
          <div class="init-timeline" id="initTimeline"></div>
        </div>
        <div class="init-tab-panel" id="initPanelMilestones">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
            <span style="font-size:14px;font-weight:600;color:#475569;">Milestones</span>
            <button class="init-btn-primary" onclick="initAddMilestone()" style="padding:6px 14px;font-size:12px;">+ Add Milestone</button>
          </div>
          <div class="init-milestones" id="initMilestonesList"></div>
        </div>
        <div class="init-tab-panel" id="initPanelTeam">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
            <span style="font-size:14px;font-weight:600;color:#475569;">Team Members</span>
            <button class="init-btn-primary" onclick="initAddMember()" style="padding:6px 14px;font-size:12px;">+ Add Member</button>
          </div>
          <div class="init-team-list" id="initTeamList"></div>
        </div>
      </div>

      <!-- Modal placeholder -->
      <div id="initModalArea"></div>
    `;

    // Tab switching
    root.querySelectorAll('.init-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        root.querySelectorAll('.init-tab').forEach(t => t.classList.remove('active'));
        root.querySelectorAll('.init-tab-panel').forEach(p => p.classList.remove('show'));
        tab.classList.add('active');
        root.querySelector(`#initPanel${_capitalize(tab.dataset.tab)}`).classList.add('show');
      });
    });

    // Filter buttons
    root.querySelectorAll('.init-filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        root.querySelectorAll('.init-filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        _renderGrid(btn.dataset.filter);
      });
    });
  }

  function _capitalize(s) {
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  // ── Data loading ─────────────────────────────────────────
  async function _loadData() {
    _currentUser = window.currentUser;
    const email = _currentUser?.email;
    const isAdmin = _currentUser?.isAdmin || _currentUser?.is_admin;

    // Load all initiatives (we'll filter client-side by membership)
    const [initiatives, members, entries] = await Promise.all([
      window.supaFetch('initiatives', '?select=*&order=updated_at.desc'),
      window.supaFetch('initiative_members', '?select=*'),
      window.supaFetch('initiative_entries', '?select=*&order=created_at.desc')
    ]);

    _members = members || [];

    // Filter initiatives to only those the user is a member of (or admin sees all)
    if (isAdmin) {
      _initiatives = initiatives || [];
    } else {
      const myInitIds = new Set(
        _members.filter(m => m.email === email).map(m => m.initiative_id)
      );
      _initiatives = (initiatives || []).filter(i => myInitIds.has(i.id));
    }

    _entries = entries || [];
  }

  // ── Render card grid ─────────────────────────────────────
  function _renderGrid(filter = 'all') {
    const grid = document.getElementById('initGrid');
    if (!grid) return;

    let list = _initiatives;
    if (filter !== 'all') list = list.filter(i => i.status === filter);

    if (list.length === 0) {
      grid.innerHTML = `
        <div class="init-empty" style="grid-column:1/-1;">
          <div class="init-empty-icon">📋</div>
          <h3>${filter === 'all' ? 'No initiatives yet' : 'No ' + filter.replace('_', ' ') + ' initiatives'}</h3>
          <p>${filter === 'all' ? 'Create your first initiative to start tracking projects and communications.' : 'Try a different filter or create a new initiative.'}</p>
        </div>
      `;
      return;
    }

    grid.innerHTML = list.map(init => {
      const memberCount = _members.filter(m => m.initiative_id === init.id).length;
      const entryCount = _entries.filter(e => e.initiative_id === init.id).length;
      const latestEntry = _entries.find(e => e.initiative_id === init.id);
      const daysAgo = latestEntry
        ? Math.floor((Date.now() - new Date(latestEntry.created_at)) / 86400000)
        : Math.floor((Date.now() - new Date(init.created_at)) / 86400000);
      const lastActivity = daysAgo === 0 ? 'Today' : daysAgo === 1 ? 'Yesterday' : daysAgo + 'd ago';

      return `
        <div class="init-card" onclick="initOpenProject('${init.id}')">
          <div class="init-card-header">
            <h3 class="init-card-title">${_esc(init.name)}</h3>
            <span class="init-status ${init.status}">${init.status.replace('_', ' ')}</span>
          </div>
          <div class="init-card-summary">${_esc(init.summary || 'No summary')}</div>
          <div class="init-card-meta">
            <span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              ${memberCount} member${memberCount !== 1 ? 's' : ''}
            </span>
            <span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
              ${entryCount} entries
            </span>
            <span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              ${lastActivity}
            </span>
          </div>
        </div>
      `;
    }).join('');
  }

  // ── Detail view ──────────────────────────────────────────
  function _openProject(id) {
    _currentInitiative = _initiatives.find(i => i.id === id);
    if (!_currentInitiative) return;

    document.getElementById('initListView').classList.add('hidden');
    const detail = document.getElementById('initDetailView');
    detail.classList.add('show');

    document.getElementById('initDetailTitle').textContent = _currentInitiative.name;
    document.getElementById('initDetailSummary').textContent = _currentInitiative.summary || '';

    // Reset to activity tab
    document.querySelectorAll('#initRoot .init-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('#initRoot .init-tab-panel').forEach(p => p.classList.remove('show'));
    document.querySelector('#initRoot .init-tab[data-tab="activity"]').classList.add('active');
    document.getElementById('initPanelActivity').classList.add('show');

    _renderTimeline();
    _renderMilestones();
    _renderTeam();

    // Push history for back button
    history.pushState({ view: 'initiatives', project: id }, '', '#initiatives&project=' + id);
  }

  function _backToList() {
    _currentInitiative = null;
    document.getElementById('initListView').classList.remove('hidden');
    document.getElementById('initDetailView').classList.remove('show');
    history.pushState({ view: 'initiatives' }, '', '#initiatives');
  }

  // ── Timeline rendering ───────────────────────────────────
  function _renderTimeline() {
    const el = document.getElementById('initTimeline');
    if (!el || !_currentInitiative) return;

    const entries = _entries
      .filter(e => e.initiative_id === _currentInitiative.id)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    if (entries.length === 0) {
      el.innerHTML = `
        <div class="init-empty">
          <div class="init-empty-icon">💬</div>
          <h3>No activity yet</h3>
          <p>Add notes, link emails, or track milestones to build the project timeline.</p>
        </div>
      `;
      return;
    }

    el.innerHTML = entries.map(entry => {
      const date = new Date(entry.created_at);
      const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      const timeStr = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
      const meta = entry.metadata || {};
      let extraMeta = '';
      if (entry.entry_type === 'email') {
        const dir = meta.direction === 'sent' ? '→' : '←';
        extraMeta = `<div class="init-entry-meta">${dir} ${_esc(meta.from || '')} → ${_esc((meta.to || []).join(', '))}</div>`;
      }
      if (entry.entry_type === 'task') {
        const done = meta.completed ? '✅' : '⬜';
        extraMeta = `<div class="init-entry-meta">${done} Assigned to: ${_esc(meta.assignee || 'Unassigned')}${meta.due_date ? ' · Due: ' + meta.due_date : ''}</div>`;
      }

      return `
        <div class="init-entry type-${entry.entry_type}">
          ${entry.is_pinned ? '<span class="pin-badge">📌 Pinned</span>' : ''}
          <div class="init-entry-header">
            <span class="init-entry-type">${entry.entry_type}</span>
            <span class="init-entry-date">${dateStr} at ${timeStr}</span>
          </div>
          ${entry.title ? `<div class="init-entry-title">${_esc(entry.title)}</div>` : ''}
          <div class="init-entry-content">${_esc(entry.content || '')}</div>
          ${extraMeta}
        </div>
      `;
    }).join('');
  }

  // ── Milestones rendering ─────────────────────────────────
  function _renderMilestones() {
    const el = document.getElementById('initMilestonesList');
    if (!el || !_currentInitiative) return;

    const milestones = _entries
      .filter(e => e.initiative_id === _currentInitiative.id && e.entry_type === 'milestone')
      .sort((a, b) => {
        const aDate = a.metadata?.due_date || '9999';
        const bDate = b.metadata?.due_date || '9999';
        return aDate.localeCompare(bDate);
      });

    if (milestones.length === 0) {
      el.innerHTML = `
        <div class="init-empty" style="padding:30px;">
          <h3 style="font-size:15px;">No milestones yet</h3>
          <p style="font-size:13px;">Add key dates and deliverables to track progress.</p>
        </div>
      `;
      return;
    }

    el.innerHTML = milestones.map(m => {
      const done = m.metadata?.completed;
      const dueDate = m.metadata?.due_date
        ? new Date(m.metadata.due_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        : 'No due date';
      return `
        <div class="init-milestone-row">
          <div class="init-milestone-check ${done ? 'done' : ''}" onclick="initToggleMilestone('${m.id}')">
            ${done ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>' : ''}
          </div>
          <div class="init-milestone-info">
            <div class="init-milestone-title ${done ? 'done' : ''}">${_esc(m.title || 'Untitled')}</div>
            <div class="init-milestone-due">${dueDate}</div>
          </div>
        </div>
      `;
    }).join('');
  }

  // ── Team rendering ───────────────────────────────────────
  function _renderTeam() {
    const el = document.getElementById('initTeamList');
    if (!el || !_currentInitiative) return;

    const team = _members.filter(m => m.initiative_id === _currentInitiative.id);

    if (team.length === 0) {
      el.innerHTML = `
        <div class="init-empty" style="padding:30px;">
          <h3 style="font-size:15px;">No team members</h3>
          <p style="font-size:13px;">Add members to control who can see this initiative.</p>
        </div>
      `;
      return;
    }

    el.innerHTML = team.map(m => {
      const initials = m.email.split('@')[0].substring(0, 2).toUpperCase();
      const name = _emailToName(m.email);
      return `
        <div class="init-team-row">
          <div class="init-team-person">
            <div class="init-team-avatar">${initials}</div>
            <div>
              <div class="init-team-name">${_esc(name)}</div>
              <div class="init-team-email">${_esc(m.email)}</div>
            </div>
          </div>
          <span class="init-team-role ${m.role}">${m.role}</span>
        </div>
      `;
    }).join('');
  }

  // ── Modal helpers ────────────────────────────────────────
  function _showModal(title, bodyHTML, onSave) {
    const area = document.getElementById('initModalArea');
    area.innerHTML = `
      <div class="init-modal-overlay" onclick="if(event.target===this)initCloseModal()">
        <div class="init-modal">
          <h3>${title}</h3>
          ${bodyHTML}
          <div class="init-modal-actions">
            <button class="init-btn-outline" onclick="initCloseModal()">Cancel</button>
            <button class="init-btn-primary" id="initModalSave">Save</button>
          </div>
        </div>
      </div>
    `;
    document.getElementById('initModalSave').addEventListener('click', onSave);
  }

  function _closeModal() {
    document.getElementById('initModalArea').innerHTML = '';
  }

  // ── CRUD: New Initiative ─────────────────────────────────
  async function _newProject() {
    _showModal('New Initiative', `
      <label>Name</label>
      <input id="initNewName" placeholder="e.g. Gimlet/Spotify Buyout Analysis" />
      <label>Summary</label>
      <textarea id="initNewSummary" placeholder="Brief description of the project scope and goals..."></textarea>
      <label>Status</label>
      <select id="initNewStatus">
        <option value="active">Active</option>
        <option value="on_hold">On Hold</option>
      </select>
    `, async () => {
      const name = document.getElementById('initNewName').value.trim();
      const summary = document.getElementById('initNewSummary').value.trim();
      const status = document.getElementById('initNewStatus').value;
      if (!name) return alert('Name is required');

      const email = _currentUser?.email || 'mz@firstmilecap.com';
      const [created] = await window.supaWrite('initiatives', 'POST', {
        name, summary, status, created_by: email
      });

      // Add creator as owner
      await window.supaWrite('initiative_members', 'POST', {
        initiative_id: created.id,
        email: email,
        role: 'owner'
      });

      _closeModal();
      await _loadData();
      _renderGrid();
      _toast('Initiative created');
    });
  }

  // ── CRUD: Edit Initiative ────────────────────────────────
  async function _editProject() {
    if (!_currentInitiative) return;
    const c = _currentInitiative;
    _showModal('Edit Initiative', `
      <label>Name</label>
      <input id="initEditName" value="${_esc(c.name)}" />
      <label>Summary</label>
      <textarea id="initEditSummary">${_esc(c.summary || '')}</textarea>
      <label>Status</label>
      <select id="initEditStatus">
        <option value="active" ${c.status === 'active' ? 'selected' : ''}>Active</option>
        <option value="on_hold" ${c.status === 'on_hold' ? 'selected' : ''}>On Hold</option>
        <option value="completed" ${c.status === 'completed' ? 'selected' : ''}>Completed</option>
        <option value="archived" ${c.status === 'archived' ? 'selected' : ''}>Archived</option>
      </select>
    `, async () => {
      const name = document.getElementById('initEditName').value.trim();
      const summary = document.getElementById('initEditSummary').value.trim();
      const status = document.getElementById('initEditStatus').value;
      if (!name) return alert('Name is required');

      await window.supaWrite('initiatives', 'PATCH', {
        name, summary, status, updated_at: new Date().toISOString()
      }, `?id=eq.${c.id}`);

      _closeModal();
      await _loadData();
      _currentInitiative = _initiatives.find(i => i.id === c.id);
      document.getElementById('initDetailTitle').textContent = name;
      document.getElementById('initDetailSummary').textContent = summary;
      _renderGrid();
      _toast('Initiative updated');
    });
  }

  // ── CRUD: Add Entry ──────────────────────────────────────
  async function _addEntry() {
    if (!_currentInitiative) return;
    _showModal('Add Entry', `
      <label>Type</label>
      <select id="initEntryType" onchange="initEntryTypeChanged()">
        <option value="note">Note</option>
        <option value="email">Email Reference</option>
        <option value="milestone">Milestone</option>
        <option value="task">Task</option>
        <option value="document">Document</option>
      </select>
      <label>Title</label>
      <input id="initEntryTitle" placeholder="Brief title" />
      <label>Content / Details</label>
      <textarea id="initEntryContent" placeholder="Enter details..."></textarea>
      <div id="initEntryExtra"></div>
    `, async () => {
      const entry_type = document.getElementById('initEntryType').value;
      const title = document.getElementById('initEntryTitle').value.trim();
      const content = document.getElementById('initEntryContent').value.trim();
      const email = _currentUser?.email || 'mz@firstmilecap.com';
      let metadata = {};

      if (entry_type === 'milestone') {
        const due = document.getElementById('initEntryDue')?.value;
        if (due) metadata.due_date = due;
        metadata.completed = false;
      }
      if (entry_type === 'task') {
        const assignee = document.getElementById('initEntryAssignee')?.value;
        const due = document.getElementById('initEntryDue')?.value;
        if (assignee) metadata.assignee = assignee;
        if (due) metadata.due_date = due;
        metadata.completed = false;
      }

      await window.supaWrite('initiative_entries', 'POST', {
        initiative_id: _currentInitiative.id,
        entry_type, title, content, metadata,
        created_by: email
      });

      // Update initiative timestamp
      await window.supaWrite('initiatives', 'PATCH', {
        updated_at: new Date().toISOString()
      }, `?id=eq.${_currentInitiative.id}`);

      _closeModal();
      await _loadData();
      _renderTimeline();
      _renderMilestones();
      _toast('Entry added');
    });
  }

  // ── CRUD: Add Milestone ──────────────────────────────────
  async function _addMilestone() {
    if (!_currentInitiative) return;
    _showModal('Add Milestone', `
      <label>Milestone Name</label>
      <input id="initMsName" placeholder="e.g. Submit buyout proposal" />
      <label>Due Date</label>
      <input id="initMsDue" type="date" />
    `, async () => {
      const title = document.getElementById('initMsName').value.trim();
      const due = document.getElementById('initMsDue').value;
      if (!title) return alert('Name is required');

      await window.supaWrite('initiative_entries', 'POST', {
        initiative_id: _currentInitiative.id,
        entry_type: 'milestone',
        title,
        metadata: { due_date: due || null, completed: false },
        created_by: _currentUser?.email || 'mz@firstmilecap.com'
      });

      await window.supaWrite('initiatives', 'PATCH', {
        updated_at: new Date().toISOString()
      }, `?id=eq.${_currentInitiative.id}`);

      _closeModal();
      await _loadData();
      _renderMilestones();
      _renderTimeline();
      _toast('Milestone added');
    });
  }

  // ── CRUD: Toggle Milestone ───────────────────────────────
  async function _toggleMilestone(entryId) {
    const entry = _entries.find(e => e.id === entryId);
    if (!entry) return;
    const meta = { ...(entry.metadata || {}) };
    meta.completed = !meta.completed;
    if (meta.completed) meta.completed_at = new Date().toISOString();

    await window.supaWrite('initiative_entries', 'PATCH', {
      metadata: meta
    }, `?id=eq.${entryId}`);

    await _loadData();
    _renderMilestones();
    _renderTimeline();
    _toast(meta.completed ? 'Milestone completed' : 'Milestone reopened');
  }

  // ── CRUD: Add Member ─────────────────────────────────────
  async function _addMember() {
    if (!_currentInitiative) return;
    _showModal('Add Team Member', `
      <label>Email</label>
      <input id="initMemberEmail" placeholder="e.g. rc@firstmilecap.com" type="email" />
      <label>Role</label>
      <select id="initMemberRole">
        <option value="member">Member</option>
        <option value="owner">Owner</option>
        <option value="viewer">Viewer</option>
      </select>
    `, async () => {
      const email = document.getElementById('initMemberEmail').value.trim().toLowerCase();
      const role = document.getElementById('initMemberRole').value;
      if (!email) return alert('Email is required');

      // Check for duplicates
      const existing = _members.find(m => m.initiative_id === _currentInitiative.id && m.email === email);
      if (existing) return alert('This person is already a member');

      await window.supaWrite('initiative_members', 'POST', {
        initiative_id: _currentInitiative.id,
        email, role
      });

      _closeModal();
      await _loadData();
      _renderTeam();
      _renderGrid();
      _toast('Member added');
    });
  }

  // ── Entry type changed (modal dynamic fields) ────────────
  window.initEntryTypeChanged = function () {
    const type = document.getElementById('initEntryType').value;
    const extra = document.getElementById('initEntryExtra');
    if (type === 'milestone' || type === 'task') {
      let html = '<label>Due Date</label><input id="initEntryDue" type="date" />';
      if (type === 'task') {
        html += '<label>Assignee Email</label><input id="initEntryAssignee" placeholder="e.g. rc@firstmilecap.com" />';
      }
      extra.innerHTML = html;
    } else {
      extra.innerHTML = '';
    }
  };

  // ── Helpers ──────────────────────────────────────────────
  function _esc(str) {
    if (!str) return '';
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
  }

  const KNOWN_NAMES = {
    'mz@firstmilecap.com': 'Morris Zeitouni',
    'rc@firstmilecap.com': 'Richard Chera',
    'ty@firstmilecap.com': 'Toby Yedid',
    'src@cacq.com': 'Stanley Chera',
    'rz@firstmilecap.com': 'Rasheq Zarif',
    'aiassistant@firstmilecap.com': 'AI Assistant',
    'apauluhn@firstmilecap.com': 'Adara Pauluhn',
    'smittal@firstmilecap.com': 'Samarth Mitta'
  };

  function _emailToName(email) {
    if (KNOWN_NAMES[email]) return KNOWN_NAMES[email];
    const local = email.split('@')[0];
    return local.replace(/[._-]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }

  function _toast(msg) {
    // Use existing toast if available in parent app
    if (typeof window.showToast === 'function') {
      window.showToast(msg);
      return;
    }
    const t = document.createElement('div');
    t.style.cssText = 'position:fixed;bottom:24px;right:24px;background:#1e293b;color:#fff;padding:12px 20px;border-radius:10px;font-size:14px;z-index:99999;box-shadow:0 4px 12px rgba(0,0,0,.15);';
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 2500);
  }

  // ── Public API (called from onclick handlers) ────────────
  window.initOpenProject = function (id) { _openProject(id); };
  window.initBackToList = function () { _backToList(); };
  window.initNewProject = function () { _newProject(); };
  window.initEditProject = function () { _editProject(); };
  window.initAddEntry = function () { _addEntry(); };
  window.initAddMilestone = function () { _addMilestone(); };
  window.initToggleMilestone = function (id) { _toggleMilestone(id); };
  window.initAddMember = function () { _addMember(); };
  window.initCloseModal = function () { _closeModal(); };

  // ── Main init (called by switchView) ─────────────────────
  window.initiativesInit = async function () {
    if (_inited) {
      // Refresh data on re-visit
      await _loadData();
      _renderGrid();
      return;
    }
    _inited = true;
    _injectCSS();
    _injectHTML();
    try {
      await _loadData();
      _renderGrid();
    } catch (e) {
      console.error('Initiatives init failed:', e);
      const root = document.getElementById('initRoot');
      if (root) root.innerHTML = '<p style="color:red;padding:20px;">Failed to load initiatives: ' + e.message + '</p>';
    }
  };

  // Handle popstate for back button
  window.addEventListener('popstate', function (e) {
    if (e.state?.view === 'initiatives' && !e.state?.project) {
      _backToList();
    }
  });

})();
