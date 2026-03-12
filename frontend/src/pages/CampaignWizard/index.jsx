import { useNavigate, useParams, useLocation } from "react-router-dom";
import { ChevronRight, Loader2, Sparkles } from "lucide-react";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";

import { useWizardForm } from "./hooks/useWizardForm";
import { WizardSidebar } from "./components/WizardSidebar";
import { OverviewStep } from "./steps/OverviewStep";
import { BudgetStep } from "./steps/BudgetStep";
import { TargetingStep } from "./steps/TargetingStep";
import { AudienceStep } from "./steps/AudienceStep";
import { CreativesStep } from "./steps/CreativesStep";
import { ScheduleStep } from "./steps/ScheduleStep";
import { BrandSafetyStep } from "./steps/BrandSafetyStep";
import { MeasurementStep } from "./steps/MeasurementStep";
import { STEPS } from "./constants";

export default function CampaignWizard() {
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();
  
  const isEdit = !!id;
  const fromMediaPlan = location.state?.fromMediaPlan || false;
  const planData = location.state?.planData || null;

  const {
    form,
    currentStep,
    completedSteps,
    loading,
    saving,
    creatives,
    forecast,
    showPlanBanner,
    setCurrentStep,
    setShowPlanBanner,
    updateField,
    handleContinue,
    handleStepClick,
    handleSave,
    getStrategyRecommendations,
  } = useWizardForm({ id, isEdit, fromMediaPlan, planData });

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <OverviewStep 
            form={form} 
            updateField={updateField}
            onGetRecommendations={getStrategyRecommendations}
          />
        );
      case 2:
        return (
          <BudgetStep 
            form={form} 
            updateField={updateField}
            forecast={forecast}
          />
        );
      case 3:
        return (
          <TargetingStep 
            form={form} 
            updateField={updateField}
          />
        );
      case 4:
        return (
          <AudienceStep 
            form={form} 
            updateField={updateField}
          />
        );
      case 5:
        return (
          <CreativesStep 
            form={form} 
            updateField={updateField}
            creatives={creatives}
          />
        );
      case 6:
        return (
          <ScheduleStep 
            form={form} 
            updateField={updateField}
          />
        );
      case 7:
        return (
          <BrandSafetyStep 
            form={form} 
            updateField={updateField}
          />
        );
      case 8:
        return (
          <MeasurementStep 
            form={form} 
            updateField={updateField}
          />
        );
      default:
        return null;
    }
  };

  const onSave = async () => {
    const response = await handleSave(false);
    if (response) {
      navigate("/campaigns");
    }
  };

  const onSaveDraft = async () => {
    await handleSave(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-[#3B82F6]" />
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-64px)]" data-testid="campaign-wizard">
      <WizardSidebar
        currentStep={currentStep}
        completedSteps={completedSteps}
        isEdit={isEdit}
        saving={saving}
        onStepClick={handleStepClick}
        onSaveDraft={onSaveDraft}
        onSave={onSave}
        onBack={() => navigate("/campaigns")}
      />

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto p-6">
          {/* Media Plan Banner */}
          {showPlanBanner && planData && (
            <div className="mb-6 p-4 rounded-lg bg-gradient-to-r from-[#10B981]/20 to-[#3B82F6]/20 border border-[#10B981]/30">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-[#10B981]/20">
                    <Sparkles className="w-5 h-5 text-[#10B981]" />
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-[#F8FAFC]">
                      Created from Media Plan
                    </h3>
                    <p className="text-xs text-[#94A3B8] mt-0.5">
                      Settings pre-filled based on your media plan recommendations
                    </p>
                    <div className="flex flex-wrap gap-3 mt-2">
                      <Badge className="bg-[#3B82F6]/20 text-[#3B82F6] text-xs">
                        Budget: ${planData.total_budget?.toLocaleString()}
                      </Badge>
                      <Badge className="bg-[#10B981]/20 text-[#10B981] text-xs">
                        {planData.bidding_strategy?.replace(/_/g, ' ')}
                      </Badge>
                      {planData.forecast?.impressions && (
                        <Badge className="bg-[#F59E0B]/20 text-[#F59E0B] text-xs">
                          Est. {(planData.forecast.impressions / 1000000).toFixed(1)}M impressions
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowPlanBanner(false)}
                  className="text-[#64748B] hover:text-[#F8FAFC] -mt-1 -mr-1"
                >
                  x
                </Button>
              </div>
            </div>
          )}
          
          {renderStepContent()}

          {/* Navigation */}
          <div className="flex justify-between mt-8 pt-6 border-t border-[#2D3B55]">
            <Button
              variant="outline"
              onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
              disabled={currentStep === 1}
              className="border-[#2D3B55] text-[#94A3B8]"
            >
              Previous
            </Button>
            <Button
              onClick={handleContinue}
              disabled={currentStep === STEPS.length}
              className="bg-[#3B82F6] hover:bg-[#2563EB]"
            >
              Continue
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
