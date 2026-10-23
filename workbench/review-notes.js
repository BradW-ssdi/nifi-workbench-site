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
    { id: 'merge-patients-search', title: 'Merge Patients: Find Patient', priority: 'November 1, priority 1', status: 'ready',
      decision: { date: '2026-10-20', text: 'Manual search becomes a search dialog over Home, the candidate list, and a read-only View Patient dialog (BA review meeting).' },
      notes: [
        { code: 'MP-1', title: 'Search criteria', pin: { sel: '#msLast' },
          text: 'A dialog over Home, opened from Merge Patients > Manual Search, in the layout of the Phase 2 patient search. Every Find Patient field from the current merge search: name, date of birth (Equal or Between), sex, street, city, state, zip, and patient IDs. Name and address fields take an operator (Starts With, Contains, Equal, Not Equal, Sounds Like for names).' },
        { code: 'MP-2', title: 'Advanced search', pin: { sel: '#msAdvancedHeading' },
          text: 'Identifier type and number, Phone, Email, Ethnicity, and Race, in a section that starts closed.' },
        { code: 'MP-3', title: 'Search messages', pin: { sel: '#searchDialog button[type=submit]' },
          text: 'Searching with nothing entered shows an error in the dialog. Search opens the candidate list; no match shows "No patients match these criteria". Clear empties every field.' }
      ] },
    { id: 'merge-patients', title: 'Merge Patients: Candidate List', priority: 'November 1, priority 1', status: 'ready',
      decision: { date: '2026-10-20', text: 'The candidate list is its own template, a queue table with Table Settings; the rules stay on the page; the survivor is a radio button (BA review meeting).' },
      notes: [
        { code: 'MP-8', title: 'Refine Search and New Search', pin: { sel: '[data-open-search="refine"]' },
          text: 'The search that produced the list is shown above it. Refine Search opens the search dialog with those criteria; New Search opens it empty. Searching from the dialog updates the list.' },
        { code: 'MP-4', title: 'Choose records to merge', pin: { sel: '#selectAll' },
          text: 'Select two or more records. The header box selects all candidates. Merge is in the bar that appears once a record is selected.' },
        { code: 'MP-5', title: 'Surviving record', pin: { sel: 'input[name="survivor"]' },
          text: 'One record survives. Marking the Surviving ID is optional; with none marked, the oldest patient ID survives. Marking a survivor also selects it for merge.' },
        { code: 'MP-6', title: 'Merge rules on screen', pin: { sel: '.alert-info' },
          text: 'The rules are written above the table. In the current system they were only in button tooltips.' },
        { code: 'MP-9', title: 'View Patient', pin: { sel: '[data-view-patient]' },
          text: 'A patient ID opens a read-only dialog, as Patient Events does from contact record search: the patient summary, then investigations, lab reports, morbidity reports, vaccinations, treatments, documents, and contact records, each with its count.' },
        { code: 'MP-10', title: 'Queue tools', pin: { sel: '#tableSettingsBtn' },
          text: 'As on every queue: Search to filter, sorting, Print, Download, Table Settings (Compact Rows), and pagination.' },
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
          text: 'Act on the whole group. Merge, Remove from merge and No merge ask for confirmation; Skip does not. Skip stays until the research task decides whether it is still needed (BA review 2026-10-20).' },
        { code: 'MS-5', title: 'Exit merge', pin: { sel: '#exitBtn' },
          text: 'Leaves the queue without acting on the group, releases the group if it was held, and goes to Home.' },
        { code: 'MS-6', title: 'After an action', pin: { sel: '#groupPos' },
          text: 'The next group loads and a message says what happened and which group is showing.' },
        { code: 'MS-7', title: 'View Patient', pin: { sel: '[data-view-patient]' },
          text: 'A patient ID opens the same read-only View Patient dialog as the candidate list.' },
        { code: 'MS-8', title: 'Table Settings', pin: { sel: '#tableSettingsBtn' },
          text: 'Table Settings (Compact Rows), which was missing, as on every queue.' }
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
        { code: 'SM-6', title: 'Reset Lab Mapping Cache', pin: { sel: 'button[data-opens="resetCacheDialog"]' },
          text: 'Runs an action instead of opening a page, so it asks for confirmation first. After the reset, a message at the top of the page says it was done.' },
        { code: 'SM-7', title: 'Restart after a reset', pin: { sel: 'button[data-opens="resetCacheDialog"]' },
          text: 'As on the current screen, the reset takes effect after the application server (WildFly) restarts, and both the confirmation and the message after the reset say so (BA answers, 2026-10-23).' }
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
    { id: 'edit-user', title: 'Edit User', priority: 'Security Management (priority 4)', status: 'ready',
      notes: [
        { code: 'EU-1', title: 'Required details', pin: { sel: '#firstName' },
          text: 'First and last name are required. The user ID cannot change after the user is added.' },
        { code: 'EU-2', title: 'External users', pin: { sel: '#external' },
          text: 'An external user works for an outside agency and must have a reporting facility.' },
        { code: 'EU-3', title: 'Program area administrator', pin: { sel: '#paa' },
          text: 'Choosing it shows the program areas this user administers.' },
        { code: 'EU-4', title: 'Roles', pin: { sel: '#rolesTitle' },
          text: 'Each role gives a permission set for one jurisdiction and program area, optionally as a guest. A jurisdiction and program area can have only one role. A user needs at least one role.' },
        { code: 'EU-5', title: 'Lookups', pin: { sel: '#facility ~ [data-lookup-search]' },
          text: 'Reporting Facility and Provider are found with Search, the same way as resulted tests in WDS.' },
        { code: 'EU-6', title: 'At least one role', pin: { sel: '#rolesTitle' }, ask: true,
          text: 'Must every active user have at least one role? This form requires one.' }
      ] },
    { id: 'manage-permission-sets', title: 'Manage Permission Sets', priority: 'Security Management (priority 4)', status: 'ready',
      notes: [
        { code: 'PS-1', title: 'Two lists', pin: { sel: '#sysTitle' },
          text: 'System defined sets come with NBS and cannot be changed, so they offer View only. User defined sets offer View and Edit.' },
        { code: 'PS-2', title: 'Search', pin: { sel: '#psFilter' },
          text: 'Filters both lists by name or description and says how many sets show.' },
        { code: 'PS-3', title: 'Add New', pin: { sel: 'main .ds-toolbar .btn-primary' },
          text: 'Opens the permission set form empty. Start from copies another set, as Add From Template does today.' }
      ] },
    { id: 'edit-permission-set', title: 'Edit Permission Set', priority: 'Security Management (priority 4)', status: 'ready',
      notes: [
        { code: 'EPS-1', title: 'One table per business object', pin: { sel: '#g-patient' },
          text: 'Each operation has a User and a Guest box. A guest has access to shared records only.' },
        { code: 'EPS-2', title: 'Requires', pin: { sel: '#op-PatientAdd-req' },
          text: 'Each "User must also have" note from the current screen is in the Requires column, and Submit checks them: turning on Add Patient without Find Patient is reported, and says what to turn on.' },
        { code: 'EPS-3', title: 'Jump to a group', pin: { sel: '.ps-side' },
          text: 'The list of groups beside the tables jumps to a group and shows how many of its operations are on.' },
        { code: 'EPS-4', title: 'Approval', pin: { sel: '#op-NotificationCreate' },
          text: 'Create Notification and Share Investigation also choose whether approval is needed, as today.' },
        { code: 'EPS-5', title: 'Guest without User', pin: { sel: '#PatientViewGuest' }, ask: true,
          text: 'Can an operation be on for Guest while it is off for User? The Requires rules cover User only, so this form does not stop it.' }
      ] },
    { id: 'view-data-source', title: 'View Data Source', priority: 'Report Management (priority 5)', status: 'ready',
      notes: [
        { code: 'DS-1', title: 'Columns', pin: { sel: '#colsTitle' },
          text: 'Each column with its title, codeset, type, and whether it is offered as an advanced filter and in column selection. Each has Edit and Delete; Delete asks first.' },
        { code: 'DS-2', title: 'Reports that use it', pin: { sel: '#repTitle' },
          text: 'The reports built on this data source.' },
        { code: 'DS-3', title: 'Deleting a data source in use', pin: { sel: '#deleteSource' }, ask: true,
          text: 'This template refuses to delete a data source while reports use it, and says how many. Is that the rule, or should deleting it also remove or move those reports?' }
      ] },
    { id: 'manage-snomeds', title: 'Lab Management search screens', priority: 'Lab Management (priority 6)', status: 'ready',
      notes: [
        { code: 'LM-1', title: 'Criteria first', pin: { sel: '#snomedCode' },
          text: 'As today, each code table screen starts with search criteria: here a SNOMED code or a description. One of the two is required. Manage LOINCs, Manage Laboratories, and the link screens work the same way.' },
        { code: 'LM-2', title: 'Contains or Equal', pin: { sel: '#snomedDesc-op' },
          text: 'The description matches as Contains or Equal, as today.' },
        { code: 'LM-3', title: 'Results', pin: { sel: '#searchForm button[type=submit]' }, after: 'search',
          text: 'Results show under the criteria with how many were found, Edit on each row, and Add New.' },
        { code: 'LM-5', title: 'Edit and Add in a dialog', pin: { sel: '#searchForm button[type=submit]' }, after: 'search',
          text: 'Edit on a row and Add New open the record in a dialog over the results, so the search stays in place. The current screens show the form under the results on the same page. Manage LOINCs, Laboratories, Local Lab Results, Local Lab Tests, and Trigger Codes also have View.' },
        { code: 'LM-4', title: 'Show a list first?', pin: { sel: '#snomedCode' }, ask: true,
          text: 'Should these screens list the codes on arrival, with the criteria as filters (as the queue screens do), instead of waiting for a search? SNOMED and LOINC tables are large, which is likely why the current screens ask first.' }
      ] },
    { id: 'manage-elr-activity-log', title: 'ELR Activity Log', priority: 'ELR/ECR Activity Logs (priority 12)', status: 'ready',
      notes: [
        { code: 'AL-1', title: 'Time frame', pin: { sel: '#logFrom' },
          text: 'From and To dates are required, as MM/DD/YYYY, and To cannot be before From. The current screen also takes a time of day.' },
        { code: 'AL-2', title: 'Status', pin: { sel: '#logSuccess' },
          text: 'Success, Failure, or both; at least one.' },
        { code: 'AL-3', title: 'Records', pin: { sel: 'main button[type=submit]' }, after: 'search',
          text: 'Each record shows when it was processed, its status, the patient, the reporting facility, the algorithm and action applied, its IDs, and the message the system logged.' },
        { code: 'AL-4', title: 'Time of day', pin: { sel: '#logTo' }, ask: true,
          text: 'Do users need the From and To times the current screen offers, or are dates enough?' },
        { code: 'AL-5', title: 'PHDC log', pin: { sel: 'main h1' },
          text: 'The PHDC Activity Log is the same screen for case documents.' }
      ] },
    { id: 'manage-bulk-import-templates', title: 'Manage Bulk Import Templates', priority: 'Manage Bulk Import (priority 7)', status: 'ready',
      notes: [
        { code: 'BI-1', title: 'Library', pin: { sel: '#templateTable' },
          text: 'Event type, template name, state, related conditions, last updated and by whom, and status, as in the current library.' },
        { code: 'BI-2', title: 'Filters', pin: { sel: '#filterChipsDiv' },
          text: 'Event Type, Template State, and Status are filters, as in the Phase 2 queues; Filter adds the other columns. Status shows Active templates on arrival.' },
        { code: 'BI-3', title: 'Import', pin: { sel: 'main .ds-toolbar' },
          text: 'Add New, Import (a template file), Print, and Download.' },
        { code: 'BI-4', title: 'Inactive on arrival?', pin: { sel: '#status' }, ask: true,
          text: 'Should the library show only Active templates when it opens, as this template does, or everything?' }
      ] },
    { id: 'manage-systems', title: 'Manage Sending and Receiving Systems', priority: 'Messaging', status: 'ready',
      notes: [
        { code: 'SY-1', title: 'Systems', pin: { sel: '#systemTable' },
          text: 'Application name, display name, facility, the report type it sends or receives, and whether it sends, receives, and allows transfers.' },
        { code: 'SY-2', title: 'Filters', pin: { sel: '#filterChipsDiv' },
          text: 'Report Type, Sender, and Recipient are filters, as in the Phase 2 queues; Filter adds the other columns.' },
        { code: 'SY-3', title: 'Add New System', pin: { sel: 'main .ds-toolbar .btn-primary' },
          text: 'The current screen puts the Create System form under the list. Here it opens on its own page.' },
        { code: 'SY-4', title: 'Same as the current screen', pin: { sel: '#systemTable tbody tr:nth-child(2)' },
          text: 'The list keeps the current screen\'s columns, and what matters most is that Add New requires the same fields the current screen does (BA answers, 2026-10-23). The local library holds one system; the other rows are samples.' }
      ] },
    { id: 'add-system', title: 'Add System', priority: 'Messaging', status: 'ready',
      notes: [
        { code: 'AS-1', title: 'Required fields', pin: { sel: '.legend-note' },
          text: 'Every field the current screen requires is required here: report type, names, OIDs, facility, and the four Yes or No questions. These matter most (BA answers, 2026-10-23).' },
        { code: 'AS-2', title: 'Errors', pin: { sel: '#errorSummary' }, after: 'submit',
          text: 'Submitting with gaps lists each one at the top. Each link moves to its field.' },
        { code: 'AS-3', title: 'Derived jurisdiction', pin: { sel: '#deriveJurisdiction-Y' },
          text: 'When Yes, a Workflow Decision Support algorithm tries to derive the jurisdiction of case reports from this sender.' },
        { code: 'AS-4', title: 'Edit', pin: { sel: 'main h1' },
          text: 'Edit uses this form, filled in.' }
      ] },
    { id: 'manage-local-lab-results', title: 'Manage Local Lab Results', priority: 'Lab Management', status: 'ready',
      notes: [
        { code: 'LR-1', title: 'Required', pin: { sel: '#lrLab' },
          text: 'Lab Name is required, and a lab result code or a description, as on the current screen.' },
        { code: 'LR-2', title: 'Results', pin: { sel: '#resultsTable' }, after: 'search',
          text: 'Each result shows its code, description, and lab, with View and Edit.' },
        { code: 'LR-3', title: 'Lab list', pin: { sel: '#lrLab' }, ask: true,
          text: 'The lab needs its name and something that tells similar labs apart, the address or the CLIA number (BA answers, 2026-10-23). Here each lab shows its CLIA number, and the address and phone show under the field once a lab is chosen. Which one to show is still open, for PI planning.' }
      ] },
    { id: 'manage-trigger-codes', title: 'Manage Trigger Codes', priority: 'Case Reporting', status: 'ready',
      notes: [
        { code: 'TC-1', title: 'View and Edit', pin: { sel: '#searchForm button[type=submit]' }, after: 'search',
          text: 'View and Edit show the trigger code in a dialog. On the current screen they open empty, so this follows the Add New form: coding system, code, display name, default condition, and version ID.' },
        { code: 'TC-2', title: 'Condition list', pin: { sel: '#tcCondition' }, ask: true,
          text: 'The current Default Condition list shows names only. This template adds the condition code, as the results do, for example Hepatitis A, acute (10110). Keep the code?' }
      ] },
    { id: 'manage-local-lab-tests', title: 'Manage Local Lab Tests', priority: 'Lab Management', status: 'ready',
      notes: [
        { code: 'LT-1', title: 'Required', pin: { sel: '#ltType' },
          text: 'Lab Name and Test Type (Ordered or Resulted) are required, and a lab test code or a description.' },
        { code: 'LT-2', title: 'Results', pin: { sel: '#resultsTable' }, after: 'search',
          text: 'Each test shows its code, description, lab, and test type, with View and Edit.' },
        { code: 'LT-3', title: 'Lab list', pin: { sel: '#ltLab' }, ask: true,
          text: 'The same lab list as Manage Local Lab Results: the name with its CLIA number, and the address under the field. Address or CLIA number is still open, for PI planning.' }
      ] },
    { id: 'link-result-snomed', title: 'Lab Result - SNOMED Link', priority: 'Lab Management', status: 'ready',
      notes: [
        { code: 'RS-1', title: 'Lab result', pin: { sel: '#lrsCode' },
          text: 'Lab Result Code is required. On the current screen it is picked from a search, which also sets the lab.' },
        { code: 'RS-2', title: 'Links', pin: { sel: '#resultsTable' }, after: 'search',
          text: 'Each link shows the lab result code, its lab, and the SNOMED code it means.' }
      ] },
    { id: 'link-test-loinc', title: 'Lab Test - LOINC Link', priority: 'Lab Management', status: 'ready',
      notes: [
        { code: 'TL-1', title: 'Lab test', pin: { sel: '#ltlCode' },
          text: 'Lab Test Code is required. On the current screen it is picked from a search, which also sets the lab.' },
        { code: 'TL-2', title: 'Links', pin: { sel: '#resultsTable' }, after: 'search',
          text: 'Each link shows the lab test code, its lab, and the LOINC code it means.' }
      ] },
    { id: 'link-loinc-condition', title: 'LOINC - Condition Link', priority: 'Lab Management', status: 'ready',
      notes: [
        { code: 'LC-1', title: 'Criteria', pin: { sel: '#lcLoinc' },
          text: 'A LOINC code or a condition is required.' },
        { code: 'LC-2', title: 'Links', pin: { sel: '#resultsTable' }, after: 'search',
          text: 'Each link shows the condition code, the LOINC code, and the disease name.' }
      ] },
    { id: 'manage-notices', title: 'Manage Notices', priority: 'Page Management', status: 'ready',
      notes: [
        { code: 'MN-1', title: 'Where notices show', pin: { sel: '#noticeTable' },
          text: 'The notices in the Notices card on Home, in display order. Today they are the Home Page entry of Custom Fields Admin (Manage Pages, then the Custom Fields Admin link, then Home Page) (BA answers, 2026-10-23).' },
        { code: 'MN-2', title: 'Types', pin: { sel: '#noticeTable thead' },
          text: 'The three types the current screen offers: Subheading (there "Subheading (for display only)"), Text (there "Comments (Read only text)"), and Hyperlink.' },
        { code: 'MN-3', title: 'Link URL required?', pin: { sel: '#addNotice' }, ask: true,
          text: 'Type, notice text, and display order are required, as on the current screen. Here a Hyperlink also needs its link URL; the current screen does not require it, so a link can be saved with nothing to open. Keep it required?' },
        { code: 'MN-4', title: 'Tooltips', pin: { sel: '#addNotice' }, ask: true,
          text: 'On Home today a tooltip shows only on a Text notice, and only while the pointer rests on it; keyboard and screen reader users never get it, and a Subheading\'s tooltip never shows. Keep Tooltip as it is, show its text on Home, or drop it?' },
        { code: 'MN-5', title: 'Display order', pin: { sel: '#noticeTable tbody tr:nth-child(2)' }, ask: true,
          text: 'Display order is typed, as on the current screen; equal numbers keep the order they were added (two notices share 1 today). Would moving a notice up or down be easier than typing numbers?' },
        { code: 'MN-6', title: 'Delete', pin: { sel: '#noticeTable tbody tr:nth-child(1) [data-act="delete"]' },
          text: 'Delete asks first. The current screen keeps a deleted notice as inactive; it no longer shows on Home or here.' },
        { code: 'MN-7', title: 'Preview on Home', pin: { sel: '#previewNotices' },
          text: 'Shows the Notices card as Home will show it, as the current screen\'s Preview does.' }
      ] },
    { id: 'manage-value-sets', title: 'Manage Value Sets', priority: 'Page Management', status: 'ready',
      notes: [
        { code: 'VS-1', title: 'Library', pin: { sel: '#valueSetTable' },
          text: 'Type, code, name, description, and status for each value set, with View and Edit, as in the current library.' },
        { code: 'VS-2', title: 'Filters', pin: { sel: '#filterChipsDiv' },
          text: 'Type and Status are filters, as in the Phase 2 queues; Filter adds the other columns.' },
        { code: 'VS-3', title: 'Type values', pin: { sel: '#vsType' }, ask: true,
          text: 'The current library has both LOCAL and Local as types. Are they the same type? Still open (asked again 2026-10-23).' }
      ] },
    { id: 'manage-templates', title: 'Manage Templates', priority: 'Page Management', status: 'ready',
      notes: [
        { code: 'TP-1', title: 'Library', pin: { sel: '#templateTable' },
          text: 'Name, description, last updated and by whom, source, and status for each template, with View.' },
        { code: 'TP-2', title: 'Toolbar', pin: { sel: 'main .ds-toolbar' },
          text: 'The import and export log, Import, Print, and Download. The current library has no Add New.' },
        { code: 'TP-3', title: 'Filters', pin: { sel: '#filterChipsDiv' },
          text: 'Source and Status are filters, as in the Phase 2 queues; Filter adds the other columns.' }
      ] },
    { id: 'manage-page-porting', title: 'Page Porting', priority: 'Page Management', status: 'ready',
      notes: [
        { code: 'PL-1', title: 'Port library', pin: { sel: '#mapTable' },
          text: 'Each map shows its event type, name, the page it ports from and to, its mapping status, the condition ported, and when.' },
        { code: 'PL-2', title: 'Where it opens', pin: { sel: 'main .breadcrumb' },
          text: 'Opened from Manage Pages (Page Porting), as the current screen is.' },
        { code: 'PL-3', title: 'Port Page', pin: { sel: 'main .ds-toolbar .btn-primary' },
          text: 'Starts a new map: map details, then questions, answers, review, and the condition to port.' }
      ] },
    { id: 'port-page', title: 'Port Page', priority: 'Page Management', status: 'ready',
      notes: [
        { code: 'PP-1', title: 'Steps', pin: { sel: '.ds-steps' },
          text: 'Porting has five steps. This is the first; the step list shows where you are.' },
        { code: 'PP-2', title: 'Map name', pin: { sel: '#mapName' },
          text: 'Required, up to 100 characters, and not the name of an existing map, as on the current screen.' },
        { code: 'PP-3', title: 'Page details', pin: { sel: '#fromDetails' },
          text: 'Choosing a page shows its description, message mapping guide, and related conditions, as the current screen does.' },
        { code: 'PP-4', title: 'Different pages', pin: { sel: '#toPage' },
          text: 'The From and To pages must be different pages (BA answers, 2026-10-23). The page chosen as From is not offered as To; choosing the To page as From empties To and says so.' }
      ] },
    { id: 'port-map-questions', title: 'Port Page: Map Questions', priority: 'Page Management', status: 'ready',
      notes: [
        { code: 'MQ-1', title: 'Questions left', pin: { sel: '#remaining' },
          text: 'How many From questions still need a To question. It updates as each one is mapped.' },
        { code: 'MQ-2', title: 'Status', pin: { sel: '#qmStatus' },
          text: 'The current statuses: Auto-Mapped, Complete, and Mapping Needed; (R) marks a question in a repeating block. Filter by status to see what is left.' },
        { code: 'MQ-3', title: 'Map in a dialog', pin: { sel: '[data-map="VAR212"]' },
          text: 'Map opens a dialog for that question, instead of loading it into a form on the page as the current screen does. Choose the To question, or that it is not ported; for coded questions, whether to map the answers too; for a repeating To question, which repeat.' },
        { code: 'MQ-4', title: 'Which To questions', pin: { sel: '[data-map="VAR212"]' },
          text: 'The To Question list keeps every data type the From question can be ported to, by the Porting Guide\'s rules (BA answers, 2026-10-23): Coded, Numeric, and Text to any of those three; Date only to Date; Participation only to Participation; Numeric and Coded only to Structured Numeric. The hint under the list says which types it shows.' },
        { code: 'MQ-5', title: 'Save and Continue', pin: { sel: '#saveMap' },
          text: 'Save and Continue saves the mapping so far, to finish later. Map Answers saves it and goes to Map Answers once every question is mapped; with questions left it says how many (BA answers, 2026-10-23).' }
      ] },
    { id: 'port-map-answers', title: 'Port Page: Map Answers', priority: 'Page Management', status: 'ready',
      notes: [
        { code: 'MA-1', title: 'Answers left', pin: { sel: '#remaining' },
          text: 'How many coded answers still need a To answer. It updates as each one is mapped.' },
        { code: 'MA-2', title: 'Map in a dialog', pin: { sel: '[data-map="VAR212|H"]' },
          text: 'Map opens a dialog for that answer: map it to an answer in the To question\'s value set, or leave it out. Some answers change on the way, for example Hours becomes unknown.' },
        { code: 'MA-3', title: 'Filter by question', pin: { sel: '#amLabel' },
          text: 'From Label narrows the list to one question\'s answers.' }
      ] },
    { id: 'port-review-mapping', title: 'Port Page: Review Mapping', priority: 'Page Management', status: 'ready',
      notes: [
        { code: 'RM-1', title: 'Every mapping', pin: { sel: '#reviewTable' },
          text: 'Questions and their answers in one list before anything is ported. Change on a row goes back to the step that sets it.' },
        { code: 'RM-2', title: 'Export Map', pin: { sel: 'main .ds-toolbar .btn-outline-primary' },
          text: 'Saves the map as a file, to import on another system.' },
        { code: 'RM-3', title: 'Technical columns', pin: { sel: '#reviewTable thead' }, ask: true,
          text: 'Answer Group is kept: it matters for questions in a repeating block (BA answers, 2026-10-23). The current screen also lists value sets, DB locations, and translation flags. Whether reviewers use those is still open; a screenshot of the current screen was asked for.' }
      ] },
    { id: 'port-condition', title: 'Port Page: Port Condition', priority: 'Page Management', status: 'ready',
      notes: [
        { code: 'PC-1', title: 'In order', pin: { sel: '#getCount' },
          text: 'Get the case count, run the pre-run check, then convert. Doing a step too early says what comes first, in the error summary.' },
        { code: 'PC-2', title: 'Confirm', pin: { sel: '#runConv' },
          text: 'Run Conversion asks first, and lists what cannot be done until every case is ported, as the current pop-up does.' },
        { code: 'PC-3', title: 'Pre-run each time', pin: { sel: '#preRun' },
          text: 'The pre-run check is needed before every conversion (BA answers, 2026-10-23).' },
        { code: 'PC-4', title: 'Failed runs', pin: { sel: '#logTable' },
          text: 'A failed run gives the administrator a clear reason (BA answers, 2026-10-23): what happened and what to do, in plain words, with the system code under it for support. For example ERR109 means a case was changed by another user during the conversion.' }
      ] },
    { id: 'view-template', title: 'View Template', priority: 'Page Management', status: 'ready',
      notes: [
        { code: 'VT-1', title: 'Same preview as View Page', pin: { sel: '.vp-tabs' },
          text: 'The tabs, sections, subsections, and questions of the template, read only, as View Page shows a page and as the current screen previews a template.' },
        { code: 'VT-2', title: 'Actions', pin: { sel: '.vp-toolbar' },
          text: 'View rules, Print, Export, and Make Inactive, as on the current screen. Make Inactive asks first.' }
      ] },
    { id: 'add-question', title: 'Add Question', priority: 'Page Management', status: 'ready',
      notes: [
        { code: 'AQ-1', title: 'Data type decides the fields', pin: { sel: '#dataType' },
          text: 'Coded: value set, default value from it, and whether other values are allowed. Date: mask and whether future dates are allowed. Numeric: mask, length, default, minimum, maximum, and related units. Text: mask, length, and default. As on the current screen.' },
        { code: 'AQ-2', title: 'Display Control', pin: { sel: '#displayControl' },
          text: 'Lists the controls for the chosen data type, as the current screen does.' },
        { code: 'AQ-3', title: 'Already used', pin: { sel: '#uniqueId' },
          text: 'The unique ID, unique name, data mart column name, and RDB column name (with the subgroup) cannot repeat another question, as on the current screen.' },
        { code: 'AQ-4', title: 'Mask names', pin: { sel: '#dataType' }, ask: true,
          text: 'The current text masks show their patterns in the name, for example Census Tract (^(\d{4}|...)$). Should the list show only the plain names?' }
      ] },
    { id: 'view-question', title: 'View Question', priority: 'Page Management', status: 'ready',
      notes: [
        { code: 'VQ-1', title: 'Sections', pin: { sel: 'main .ds-form-section h2' },
          text: 'Basic Information, User Interface, Data Mart, Messaging, and Administrative, as on the current screen. The sample is the first question in the library, a coded one.' },
        { code: 'VQ-2', title: 'Make Inactive', pin: { sel: '#toggleStatus' },
          text: 'Asks first, then shows the new status at the top of the page.' },
        { code: 'VQ-3', title: 'Other data types', pin: { sel: 'main h1' }, ask: true,
          text: 'Date, numeric, and text questions show other fields (mask, length, range, units). Do you need a template for each type, or is the coded one enough to build from?' }
      ] },
    { id: 'edit-question', title: 'Edit Question', priority: 'Page Management', status: 'ready',
      notes: [
        { code: 'EQ-1', title: 'What can change', pin: { sel: 'main .ds-form-section .ds-dl' },
          text: 'The type, ID, name, data type, value set, and data mart table and column are shown read only, as on the current screen. Everything else can change.' },
        { code: 'EQ-2', title: 'Messaging', pin: { sel: '#included-Y' },
          text: 'The messaging fields show only while Included in Message is Yes.' },
        { code: 'EQ-3', title: 'Required', pin: { sel: '.legend-note' },
          text: 'The same required fields as the current screen.' }
      ] },
    { id: 'view-value-set', title: 'View Value Set', priority: 'Page Management', status: 'ready',
      notes: [
        { code: 'VV-1', title: 'Concepts', pin: { sel: '#conceptTable' },
          text: 'Every concept in the value set: local code, display name, concept code and name, code system, status, and effective dates.' },
        { code: 'VV-2', title: 'Add and edit in a dialog', pin: { sel: '#addConcept' },
          text: 'Add New Concept and Edit on a row open the concept form in a dialog, as the current screen opens it in a pop-up window. The local code cannot change once added.' },
        { code: 'VV-3', title: 'Short display name length', pin: { sel: '#addConcept' }, ask: true,
          text: 'The current Add Concept form takes 256 characters for Short Display Name; Edit Concept takes 100. Which is right? This template uses 100.' }
      ] },
    { id: 'edit-value-set', title: 'Edit Value Set', priority: 'Page Management', status: 'ready',
      notes: [
        { code: 'EV-1', title: 'What can change', pin: { sel: '#vsName' },
          text: 'Name and description. The type and code cannot change, as on the current screen.' }
      ] },
    { id: 'view-system', title: 'View System', priority: 'Messaging', status: 'ready',
      notes: [
        { code: 'VS2-1', title: 'Same sections as the form', pin: { sel: 'main .ds-form-section h2' },
          text: 'System, Facility, and Exchange, read only. The sample is the one system in the local library.' }
      ] },
    { id: 'edit-system', title: 'Edit System', priority: 'Messaging', status: 'ready',
      notes: [
        { code: 'ES-1', title: 'The Add System form, filled in', pin: { sel: '#displayName' },
          text: 'Every name and identifier takes up to 100 characters, as on the current screen.' }
      ] },
    { id: 'edit-page', title: 'Edit Page: drag and drop', priority: 'Proof of concept, Page Builder (priority 3)', status: 'ready',
      notes: [
        { code: 'EP-1', title: 'Three ways to move', pin: { sel: '.pb-q .pb-handle' },
          text: 'Drag by the handle; or on the handle press Enter, move with the arrow keys, Enter again to drop; or use the Move menu. Each move says where the item landed.' },
        { code: 'EP-2', title: 'Move menu', pin: { sel: '.pb-q .pb-move' },
          text: 'Move up, Move down, and Move to, which picks the tab, the destination, and the position from lists, then asks to confirm, as the current Relocate does.' },
        { code: 'EP-3', title: 'Undo', pin: { sel: '.pb-tabs' }, after: 'move an item',
          text: 'After each move a message says what moved and where, with Undo.' },
        { code: 'EP-4', title: 'Saving', pin: { sel: '.pb-section' },
          text: 'Each move saves as it happens. If a save fails the item goes back and the error shows. Only a draft page can be edited.' },
        { code: 'EP-5', title: 'Moving between tabs', pin: { sel: '#t1' },
          text: 'As in the current page builder, Move to can send a question to a subsection, a subsection to a section, or a section to another tab. Drag and the keyboard stay on the open tab. After a move to another tab, that tab opens on the moved item.' },
        { code: 'EP-6', title: 'Repeating blocks', pin: { sel: '#p0 .pb-sub[data-block] .pb-row' },
          text: 'A repeating block has its own background and a Repeating block label. As in the current page builder, a question in a repeating block moves only within it, and other questions cannot be dragged into one. Move to applies the current Relocate checks: a published question stays in its block, and a question can go into a block only if it is not published and is stored as an answer.' },
        { code: 'EP-7', title: 'Indicators', pin: { sel: '.pb-legend' },
          text: 'Each question shows the Standard question (S) or Published (P) indicator, as the current page builder does, with its identifier after the label. The legend above the tabs explains them.' },
        { code: 'EP-8', title: 'Confirm before Move to', pin: { sel: '.pb-q .pb-move' }, after: 'choose Move to and then Move',
          text: 'Move to asks to confirm before it moves, naming the item, the destination, and the tab, as the current Relocate asks "Please press OK to confirm the relocate operation." Back returns to the choices. Drag, the keyboard, and Move up or down do not ask, as in the current page builder, and each move can be undone.' },
        { code: 'EP-9', title: 'Rearranging tabs', pin: { sel: '.pb-tabs' }, ask: true,
          text: 'The current page builder can also reorder tabs. This proof of concept leaves that out, because the Phase 3 Edit Page is not expected to use tabs. Is that right?' },
        { code: 'EP-10', title: 'Fixed questions', pin: { sel: '.pb-sub' }, ask: true,
          text: 'Beyond the repeating block rules, are there questions or subsections that must not move, for example standard questions a page needs in place? Those would show no handle.' }
      ] },
    { id: 'manage-conditions', title: 'Queue component: Manage Conditions', priority: 'Proof of concept, queues (all November 1 queues use it)', status: 'ready',
      notes: [
        { code: 'QC-1', title: 'Real data, every page', pin: { sel: '#pageSummary' },
          text: 'The library holds all 263 conditions from the current system. Search, filters, sorting, and paging work across all of them, as the server does, not only on the rows shown. It opens filtered to Status: Active.' },
        { code: 'QC-2', title: 'Filter chips as in Phase 2', pin: { sel: '#mc-programArea' },
          text: 'Program Area, Condition Family, Status, and NND are always shown. Each menu has the operator (equals or not equals), a search box, Select All, Blanks, the values, Clear selection, and Update. Update with nothing checked is not allowed.' },
        { code: 'QC-3', title: 'Changing the operator on a chip', pin: { sel: '#mc-status-chipOperator' },
          text: 'On a chip with a filter applied, changing equals to not equals updates the table right away, as in Phase 2.' },
        { code: 'QC-4', title: 'Filter adds more columns', pin: { sel: '#filtersId' },
          text: 'Filter lists the columns without a standard chip (Coinfection Group, Investigation Page, Infectious Period, Needs publish). Checking one adds its chip, after the others, with its menu open; its close button removes the chip and its filter.' },
        { code: 'QC-5', title: 'Reset', pin: { sel: '#clearFilters' },
          text: 'Reset clears every filter (Status too), the search, the sort, and the page size, and shows the whole library again. It shows only while something is applied.' },
        { code: 'QC-6', title: 'Sorting and paging', pin: { sel: '#conditionName' },
          text: 'A sortable column sorts ascending, then descending. Filtering, searching, or sorting goes back to page 1 and keeps the page size; paging keeps the filters and the sort. Up to five page numbers show around the current page, as in Phase 2.' },
        { code: 'QC-7', title: 'Table Settings', pin: { sel: '#tableSettingsBtn' }, ask: true,
          text: 'Table Settings has Compact Rows, as on Phase 2 queues, kept for the session. Phase 2 starts with compact rows on; this template starts at the standard row height. Which should Phase 3 queues start with?' }
      ] },
    { id: 'manage-conditions-dialogs', title: 'Conditions: dialog on dialog', priority: 'Proof of concept', status: 'ready',
      notes: [
        { code: 'CD-1', title: 'View in a dialog', pin: { sel: '#condTable tbody tr [data-view]' },
          text: 'View opens over the list, so the list stays where it was. Its sections are accordions, as in the Phase 2 dialogs, with Collapse All.' },
        { code: 'CD-2', title: 'Edit replaces View', pin: { sel: '#condTable' }, after: 'View, then Edit',
          text: 'Edit opens from View and View hides while Edit is open (one dialog on screen at a time). Cancel or Escape brings View back as it was; Submit brings it back with the changes and a confirmation.' },
        { code: 'CD-3', title: 'Unsaved changes', pin: { sel: '#addBtn' },
          text: 'Closing a changed form asks whether to discard the changes. The question opens on top of the form, which stays in view. Keep editing returns to the form with the changes kept.' },
        { code: 'CD-4', title: 'Dialog or page', pin: { sel: '#addBtn' }, ask: true,
          text: 'The condition form is long. Should Add and Edit Condition be dialogs in production, or stay full pages (the Add and Edit Condition templates)? Dialogs suit short forms.' },
        { code: 'CD-5', title: 'Same fields and rules as the pages', pin: { sel: '#addBtn' }, after: 'Add New',
          text: 'The Add and Edit dialogs use the fields, option lists, and rules of the Add Condition and Edit Condition templates: Edit shows the coding system, code, program area, and status read only; the co-infection group is only for STD and HIV/AIDS; the days are required only when the infectious period is calculated.' }
      ] }
  ];

  window.REVIEW = {
    status: { draft: 'Draft', ready: 'Ready for BA review', changes: 'Changes requested', approved: 'Approved' },
    templates: T,
    /* Feedback on this page is saved as comments on Jira stories, through the proxy in tools/ba-review-proxy (see its
       README). proxy: the service's /api/feedback address; empty means not connected yet. issues: template id to its
       Jira story; a template without one uses defaultIssue. Every story here must also be in the proxy's ISSUES. */
    jira: {
      site: 'https://hhsc-pha.atlassian.net',
      proxy: '',
      defaultIssue: '',
      issues: {}
    }
  };
})();
