import re

path = r"d:\M-sis-project\pulmo-rehab\doctor-web\src\components\PatientDetailView.tsx"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

# Locate the CollapsibleContent block
start_marker = "<CollapsibleContent>"
end_marker = "</CollapsibleContent>"

start_idx = content.index(start_marker)
end_idx = content.index(end_marker, start_idx) + len(end_marker)

old_block = content[start_idx:end_idx]

new_block = """<CollapsibleContent>
            <PatientOverviewModules
              patient={patient}
              latestAssessment={latestAssessment}
              assessmentLoading={assessmentLoading}
              rehabLevelDetail={rehabLevelDetail}
              rehabLevelLoading={rehabLevelLoading}
              followUpLabel={followUpState.label}
              followUpNote={followUpState.note}
              followUpActionLabel={followUpState.actionLabel}
              latestLog={latestLog}
              latestPlan={latestPlan}
              hasPlans={hasPlans}
              plansLoading={plansLoading}
              plansError={plansError}
              onOpenAssessmentModal={handleOpenAssessmentModal}
              onOpenProfileModal={handleOpenProfileModal}
              onFollowUpAction={handleFollowUpAction}
              formatDate={formatDate}
              formatDateTime={formatDateTime}
            />
          </CollapsibleContent>"""

content = content[:start_idx] + new_block + content[end_idx:]

with open(path, "w", encoding="utf-8") as f:
    f.write(content)

print("Done. Block replaced successfully.")
print(f"Old block length: {len(old_block)} chars")
print(f"New block length: {len(new_block)} chars")