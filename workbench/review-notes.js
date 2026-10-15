/* BA review: templates, their review status, and numbered requirement notes.
   Workbench only. The templates in workbench/screens carry no notes; review.html loads a template in a frame and
   pins these notes onto it, so the markup developers copy stays clean.

   Each note:
     code   short reference BAs quote in feedback (MP-3)
     title  what the note is about
     text   the requirement, in plain words
     pin    where it sits: { sel: CSS selector, text: optional heading or link text to match, tab: optional
            selector clicked first, for content on a tab that is not open }
     ask    true when the note is a question for the BA rather than a stated requirement
     after  when the pinned element only appears after an action, what that action is

   Status values: draft, ready (ready for BA review), changes (changes requested), approved.
   Record a decision with the date and the source (the Jira story or meeting), never a person's name. */
(function () {
  'use strict';

  var WDS_FORM = [
    { code: 'WA-1', title: 'Two tabs', pin: { sel: '#tabBasic' },
      text: 'Basic Criteria and Action are tabs. "Next: Action" ends the first tab. After a failed save each tab with errors shows how many.' },
    { code: 'WA-2', title: 'Algorithm Name and Event Type', pin: { sel: '#algName' },
      text: 'Both required. Event Type is Laboratory Report for this template; Case Report algorithms are not in the November 1 scope.' },
    { code: 'WA-3', title: 'Frequency', pin: { sel: '#frequency' },
      text: 'Real-Time is the only frequency for laboratory reports, as in the current system.' },
    { code: 'WA-4', title: 'Apply To', pin: { sel: '#applyHint' },
      text: 'Electronic Document always applies. Documents Entered By External Users is optional.' },
    { code: 'WA-5', title: 'Sending Systems', pin: { sel: '#sendingHint' },
      text: 'Choosing no sending system means the algorithm applies to every system.' },
    { code: 'WA-6', title: 'Action', pin: { sel: '#actionType', tab: '#tabAction' },
      text: 'Mark as Reviewed, Create Investigation, or Create Investigation with Notification. Each action adds its own "On failure" choice; the Create actions add the Investigation Type, which comes from the condition.' },
    { code: 'WA-7', title: 'Lab Criteria', pin: { sel: 'h2', text: 'Lab Criteria', tab: '#tabAction' },
      text: 'ANY or ALL of the rows must match. Each row is a resulted test (LOINC lookup) and one result: coded (SNOMED lookup), numeric (operator, number, units; Between takes two numbers), or text. At least one row is required.' },
    { code: 'WA-8', title: 'Advanced and investigation criteria', pin: { sel: 'h2', text: 'Advanced Lab Criteria', tab: '#tabAction' },
      text: 'Shown only after answering Yes to their questions. The question chosen decides the logic and the value: coded questions use Equal or Not Equal and a list, numbers use comparisons, dates use Before, On, After, text uses Contains, Equal, Not Equal, Starts With.' },
    { code: 'WA-9', title: 'Investigation Default Values', pin: { sel: 'h2', text: 'Investigation Default Values', tab: '#tabAction' }, after: 'choose a Create Investigation action',
      text: 'Only for the Create Investigation actions. Each row sets a question on the new investigation to a value.' },
    { code: 'WA-10', title: 'Saving', pin: { sel: 'button[type=submit]' },
      text: 'Save checks required fields on both tabs, skipping sections that are hidden. The error list links to each field and opens its tab. After saving, View opens with a confirmation.' }
  ];

  var T = [
    { id: 'merge-patients', title: 'Merge Patients: Manual Search', priority: 'November 1, priority 1', status: 'ready',
      notes: [
        { code: 'MP-1', title: 'Search criteria', pin: { sel: '#searchForm' },
          text: 'Every Find Patient field from the current merge search: name, date of birth (Equal or Between), sex, street, city, state, zip, and patient IDs. Name and address fields take an operator (Starts With, Contains, Equal, Not Equal, Sounds Like for names).' },
        { code: 'MP-2', title: 'Advanced search', pin: { sel: '#msAdvancedToggle' },
          text: 'ID Type, ID Number, Phone, Email, Ethnicity and Race, closed until opened.' },
        { code: 'MP-3', title: 'Search messages', pin: { sel: '#searchForm button[type=submit]' },
          text: 'Searching with nothing entered shows an error. No match shows "No patients match these criteria". Clear empties every field.' },
        { code: 'MP-4', title: 'Choose records to merge', pin: { sel: '#selectAll' },
          text: 'Select two or more records. The header box selects all candidates.' },
        { code: 'MP-5', title: 'Surviving record', pin: { sel: 'input[name="survivor"]' },
          text: 'One record survives. Marking the Surviving ID is optional; with none marked, the oldest patient ID survives. Marking a survivor also selects it for merge.' },
        { code: 'MP-6', title: 'Merge rules on screen', pin: { sel: '.alert-info' },
          text: 'The rules are written above the table. In the current system they were only in button tooltips.' },
        { code: 'MP-7', title: 'Confirm before merging', pin: { sel: '#candTable' }, after: 'select records and choose Merge',
          text: 'Merge lists the records and which one survives, and asks for confirmation. After the merge the surviving patient opens.' }
      ] },
    { id: 'merge-system-identified', title: 'Merge Patients: System Identified', priority: 'November 1, priority 1', status: 'ready',
      notes: [
        { code: 'MS-1', title: 'Queue position', pin: { sel: '#groupPos' },
          text: 'Which group of how many, and under it when matching last ran and how many groups are left. Both update after every action.' },
        { code: 'MS-2', title: 'The group', pin: { sel: '#groupTitle' },
          text: 'Each group is the candidates the matching process found for one person, with what they matched on.' },
        { code: 'MS-3', title: 'Merge and Remove from merge', pin: { sel: '#candTable' },
          text: 'Act on the selected records, with the same rules as the manual search: two or more records, one survivor.' },
        { code: 'MS-4', title: 'No merge and Skip', pin: { sel: '#noMergeBtn' },
          text: 'Act on the whole group. Merge, Remove from merge and No merge ask for confirmation; Skip does not.' },
        { code: 'MS-5', title: 'Exit merge', pin: { sel: '#exitBtn' },
          text: 'Leaves the queue without acting on the group, releases the group if it was held, and goes to Home.' },
        { code: 'MS-6', title: 'After an action', pin: { sel: '#groupPos' },
          text: 'The next group loads and a message says what happened and which group is showing.' }
      ] },
    { id: 'system-management', title: 'System Management main menu', priority: 'November 1', status: 'ready',
      decision: { date: '2026-10-08', text: 'Layout chosen in BA review: side nav of modules beside a card for every module.' },
      notes: [
        { code: 'SM-1', title: 'Find a setting', pin: { sel: '#find' },
          text: 'Filters as you type. Matches a setting’s name and the names of the module and group it sits in, so "security" finds every security setting. Modules with no match leave the side nav.' },
        { code: 'SM-2', title: 'Module side nav', pin: { sel: '.sm-nav' },
          text: 'One link per module with its number of settings. A link goes to that module’s card.' },
        { code: 'SM-3', title: 'Cards', pin: { sel: '#mod-decision-support' },
          text: 'One card per module in two columns, read down the first column and then the second, the same order as the side nav.' },
        { code: 'SM-4', title: 'Permissions', pin: { sel: '#mod-security' },
          text: 'A user sees only the settings their permissions allow. A module with nothing visible is left out, and the counts are of visible settings.' },
        { code: 'SM-5', title: 'Scope', pin: { sel: '#mod-page-management' },
          text: 'Manage Alerts, Manage User Email, Epi-Link (Lot Number) Management and Manage HIV Partner Services File are Nice to Have and not in the menu. Manage Notices is under Page Management, after Manage Pages.' },
        { code: 'SM-6', title: 'Reset Lab Mapping Cache', pin: { sel: 'a', text: 'Reset Lab Mapping Cache' },
          text: 'Runs an action instead of opening a page, so it will ask for confirmation first.' }
      ] },
    { id: 'wds-algorithm-library', title: 'WDS: Algorithm Library', priority: 'November 1, priority 2', status: 'ready',
      notes: [
        { code: 'WL-1', title: 'Filter', pin: { sel: '#filterInput' },
          text: 'Filters the list as you type and says how many algorithms are shown.' },
        { code: 'WL-2', title: 'Columns and sorting', pin: { sel: '#algTable thead' },
          text: 'Event Type, Algorithm Name, Action, Last Updated, Status. Each column sorts.' },
        { code: 'WL-3', title: 'View and Edit', pin: { sel: '#algTable tbody tr td:last-child' },
          text: 'Each row opens its algorithm to view or edit.' },
        { code: 'WL-4', title: 'Import', pin: { sel: '#importBtn' },
          text: 'Imports an algorithm from the XML file that Export on the View page produces.' },
        { code: 'WL-5', title: 'Paging', pin: { sel: '#pageSize' },
          text: 'Item count, page numbers, and items per page, as in the Phase 2 queues.' }
      ] },
    { id: 'wds-add-algorithm', title: 'WDS: Add Algorithm', priority: 'November 1, priority 2', status: 'ready', notes: WDS_FORM },
    { id: 'wds-edit-algorithm', title: 'WDS: Edit Algorithm', priority: 'November 1, priority 2', status: 'ready',
      notes: [{ code: 'WE-1', title: 'Edit opens filled in', pin: { sel: 'h1' },
        text: 'The same form as Add with the saved algorithm loaded and its name in the title. Cancel returns to View.' }].concat(WDS_FORM) },
    { id: 'wds-view-algorithm', title: 'WDS: View Algorithm', priority: 'November 1, priority 2', status: 'ready',
      notes: [
        { code: 'WV-1', title: 'Name, status, last updated', pin: { sel: 'h1' },
          text: 'Under the title: the algorithm name, Active or Inactive, and when and by whom it was last updated.' },
        { code: 'WV-2', title: 'Print, Export, Edit', pin: { sel: 'button', text: 'Export' },
          text: 'Export downloads the algorithm as the XML file that Import in the library reads.' },
        { code: 'WV-3', title: 'One page, read only', pin: { sel: 'h2', text: 'Basic Criteria' },
          text: 'The same sections as Add, on one page instead of tabs, with the criteria as tables.' }
      ] },
    { id: 'add-page', title: 'Add Page', priority: 'Page Builder (priority 3)', status: 'ready',
      notes: [
        { code: 'AP-1', title: 'Required details', pin: { sel: '#eventType' },
          text: 'Event type, template, message mapping guide, and page name are required. Data mart name and description are optional.' },
        { code: 'AP-2', title: 'Template follows the event type', pin: { sel: '#template' },
          text: 'The template list shows the templates for the chosen event type.' },
        { code: 'AP-3', title: 'Page conditions', pin: { sel: '#eventType' },
          text: 'Only investigation pages have conditions. The section appears when Event Type is Investigation.', after: 'choose Investigation as the event type' },
        { code: 'AP-4', title: 'Conditions already on a page', pin: { sel: '#condHelp' }, after: 'choose Investigation as the event type',
          text: 'Only conditions not mapped to another page are listed. A condition already on a page cannot be added; that page is cloned instead.' },
        { code: 'AP-5', title: 'Choosing conditions', pin: { sel: '#condFind' }, after: 'choose Investigation as the event type',
          text: 'Find narrows the list; checked conditions show as chips that can be removed. This replaces the two lists with Add and Remove buttons.' },
        { code: 'AP-6', title: 'After Submit', pin: { sel: 'main button[type=submit]' },
          text: 'The new page is a draft, and Edit Page opens on it.' },
        { code: 'AP-7', title: 'Are conditions required?', pin: { sel: '#eventType' }, ask: true,
          text: 'Must an investigation page have at least one related condition before it is saved? The current screen does not require one.' }
      ] },
    { id: 'view-page', title: 'View Page', priority: 'Page Builder (priority 3)', status: 'ready',
      notes: [
        { code: 'VP-1', title: 'Actions by page state', pin: { sel: '.vp-toolbar' },
          text: 'A published page offers Create new draft and Save as template. A draft offers Edit, Publish, and Delete draft. Page details, rules, history, and metadata are always there.' },
        { code: 'VP-2', title: 'Page details', pin: { sel: '#detailsBtn' },
          text: 'Event type, name, description, related conditions, data mart name, and status, in a dialog.' },
        { code: 'VP-3', title: 'Questions read only', pin: { sel: '.vp-q' },
          text: 'Each question shows its label and type, with Required and any rule that shows or hides it as text. The current screen draws every question as a disabled form control.' },
        { code: 'VP-4', title: 'Sections and subsections', pin: { sel: '[data-collapse-subs]' },
          text: 'Each section and subsection opens and closes. Collapse subsections closes every subsection in a section at once.' },
        { code: 'VP-5', title: 'Tabs', pin: { sel: '#tCase' },
          text: 'Patient, Case Info, Contact Tracing, Contact Records, and Supplemental Info, as the page defines them.' },
        { code: 'VP-6', title: 'Back to top', pin: { sel: '.vp-section-head' }, ask: true,
          text: 'The current screen has a Back to top link on every section. This template leaves it out, since sections close and the page header is always reachable. Is Back to top still needed?' }
      ] },
    { id: 'edit-page', title: 'Edit Page: drag and drop', priority: 'Proof of concept, Page Builder (priority 3)', status: 'ready',
      notes: [
        { code: 'EP-1', title: 'Three ways to move', pin: { sel: '.pb-q .pb-handle' },
          text: 'Drag by the handle; or on the handle press Enter, move with the arrow keys, Enter again to drop; or use the Move menu. Each move says where the item landed.' },
        { code: 'EP-2', title: 'Move menu', pin: { sel: '.pb-q .pb-move' },
          text: 'Move up, Move down, and Move to, which picks the destination subsection and position from lists.' },
        { code: 'EP-3', title: 'Undo', pin: { sel: '.pb-tabs' }, after: 'move an item',
          text: 'After each move a message says what moved and where, with Undo.' },
        { code: 'EP-4', title: 'Saving', pin: { sel: '.pb-section' },
          text: 'Each move saves as it happens. If a save fails the item goes back and the error shows. Only a draft page can be edited.' },
        { code: 'EP-5', title: 'Moving between tabs', pin: { sel: '#tCase' }, ask: true,
          text: 'Should a question or subsection be able to move to another tab? The proof of concept keeps moves within the open tab.' },
        { code: 'EP-6', title: 'Fixed questions', pin: { sel: '.pb-sub' }, ask: true,
          text: 'Are there questions or subsections that must not move, for example standard questions a page needs in place? Those would show no handle.' }
      ] },
    { id: 'manage-conditions-dialogs', title: 'Conditions: dialog on dialog', priority: 'Proof of concept', status: 'ready',
      notes: [
        { code: 'CD-1', title: 'View in a dialog', pin: { sel: '#condTable tbody tr [data-view]' },
          text: 'View opens over the list, so the list stays where it was.' },
        { code: 'CD-2', title: 'Edit on top of View', pin: { sel: '#condTable' }, after: 'View, then Edit',
          text: 'Edit opens on top of View. Escape or Cancel closes only Edit and returns to View; Save returns to View with the changes and a confirmation.' },
        { code: 'CD-3', title: 'Unsaved changes', pin: { sel: '#addBtn' },
          text: 'Closing a changed form asks whether to discard the changes. Keep editing returns to the form with the changes kept.' },
        { code: 'CD-4', title: 'Dialog or page', pin: { sel: '#addBtn' }, ask: true,
          text: 'The condition form is long. Should Add and Edit Condition be dialogs in production, or stay full pages (the Add and Edit Condition templates)? Dialogs suit short forms.' }
      ] }
  ];

  window.REVIEW = {
    status: { draft: 'Draft', ready: 'Ready for BA review', changes: 'Changes requested', approved: 'Approved' },
    templates: T
  };
})();
