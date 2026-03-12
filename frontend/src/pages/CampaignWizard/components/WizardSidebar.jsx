import { ArrowLeft, Check, Save, ChevronRight, Loader2 } from "lucide-react";
import { Button } from "../../../components/ui/button";
import { STEPS } from "../constants";

export function WizardSidebar({ 
  currentStep, 
  completedSteps, 
  isEdit, 
  saving,
  onStepClick,
  onSaveDraft,
  onSave,
  onBack
}) {
  return (
    <div className="w-72 surface-primary border-r border-[#2D3B55] flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-[#2D3B55]">
        <Button
          variant="ghost"
          onClick={onBack}
          className="text-[#94A3B8] hover:text-[#F8FAFC] mb-2 -ml-2"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to campaigns
        </Button>
        <h1 className="text-lg font-semibold text-[#F8FAFC]">
          {isEdit ? "Edit campaign" : "New campaign"}
        </h1>
      </div>

      {/* Steps */}
      <div className="flex-1 p-4 overflow-y-auto">
        <div className="space-y-1">
          {STEPS.map((step) => {
            const Icon = step.icon;
            const isActive = currentStep === step.id;
            const isCompleted = completedSteps.has(step.id);
            const isAccessible = step.id <= currentStep || completedSteps.has(step.id - 1) || step.id === currentStep + 1;

            return (
              <div
                key={step.id}
                onClick={() => isAccessible && onStepClick(step.id)}
                className={`flex items-center gap-3 p-3 rounded-lg transition-all ${
                  isActive
                    ? "bg-[#3B82F6]/20 border border-[#3B82F6]"
                    : isCompleted
                    ? "bg-[#10B981]/10 cursor-pointer hover:bg-[#10B981]/20"
                    : isAccessible
                    ? "cursor-pointer hover:bg-[#1E293B]"
                    : "opacity-50 cursor-not-allowed"
                }`}
                data-testid={`wizard-step-${step.id}`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  isActive
                    ? "bg-[#3B82F6] text-white"
                    : isCompleted
                    ? "bg-[#10B981] text-white"
                    : "bg-[#2D3B55] text-[#64748B]"
                }`}>
                  {isCompleted ? <Check className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                </div>
                <span className={`text-sm ${
                  isActive ? "text-[#F8FAFC] font-medium" : "text-[#94A3B8]"
                }`}>
                  {step.title}
                </span>
                {isActive && <ChevronRight className="w-4 h-4 ml-auto text-[#3B82F6]" />}
              </div>
            );
          })}
        </div>
      </div>

      {/* Actions */}
      <div className="p-4 border-t border-[#2D3B55] space-y-2">
        <Button
          variant="outline"
          className="w-full border-[#2D3B55] text-[#94A3B8] hover:text-[#F8FAFC]"
          onClick={onSaveDraft}
          disabled={saving}
        >
          <Save className="w-4 h-4 mr-2" />
          Save as draft
        </Button>
        <Button
          className="w-full bg-[#3B82F6] hover:bg-[#2563EB]"
          onClick={onSave}
          disabled={saving}
          data-testid="create-campaign-btn"
        >
          {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
          {isEdit ? "Update campaign" : "Create campaign"}
        </Button>
      </div>
    </div>
  );
}
