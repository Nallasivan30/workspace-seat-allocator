"use client";

import * as React from "react";
import {
  Plus,
  Edit2,
  Trash2,
  UserCheck,
  UserX,
  Layers,
  Building2,
  CheckCircle,
  HelpCircle,
  AlertTriangle,
} from "lucide-react";
import {
  useBuildings,
  useBuildingFloors,
  useSeats,
  useCreateSeat,
  useUpdateSeat,
  useDeleteSeat,
  useAllocateSeat,
  useReleaseSeat,
} from "@/lib/hooks/use-seats";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { FormDialog } from "@/components/shared/form-dialog";
import { SeatForm } from "@/components/shared/forms/seat-form";
import { AllocationForm } from "@/components/shared/forms/allocation-form";
import { ReleaseForm } from "@/components/shared/forms/release-form";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

export default function SeatsPage() {
  const { toast } = useToast();

  // Cascading selections
  const [selectedBuildingId, setSelectedBuildingId] = React.useState<number | null>(null);
  const [selectedFloorId, setSelectedFloorId] = React.useState<number | null>(null);
  const [selectedSeat, setSelectedSeat] = React.useState<any | null>(null);

  // Dialog controls
  const [createSeatOpen, setCreateSeatOpen] = React.useState(false);
  const [editSeatOpen, setEditSeatOpen] = React.useState(false);
  const [allocateOpen, setAllocateOpen] = React.useState(false);
  const [releaseOpen, setReleaseOpen] = React.useState(false);

  // Queries
  const { data: buildings, isLoading: buildingsLoading } = useBuildings();
  const { data: floors, isLoading: floorsLoading } = useBuildingFloors(selectedBuildingId || 0);
  const { data: seats, isLoading: seatsLoading } = useSeats(
    selectedFloorId ? { floor_id: selectedFloorId } : {}
  );

  // Mutations
  const createSeatMutation = useCreateSeat();
  const updateSeatMutation = useUpdateSeat(selectedSeat?.id || "");
  const deleteSeatMutation = useDeleteSeat();
  const allocateMutation = useAllocateSeat();
  const releaseMutation = useReleaseSeat(selectedSeat?.current_allocation?.id || 0);

  // Auto-select building
  React.useEffect(() => {
    if (buildings && buildings.length > 0 && selectedBuildingId === null) {
      setSelectedBuildingId(buildings[0].id);
    }
  }, [buildings, selectedBuildingId]);

  // Auto-select floor
  React.useEffect(() => {
    if (floors && floors.length > 0) {
      // Find if current selection is valid, otherwise set first floor
      const isValid = floors.some((f) => f.id === selectedFloorId);
      if (!isValid) {
        setSelectedFloorId(floors[0].id);
      }
    } else {
      setSelectedFloorId(null);
    }
  }, [floors, selectedFloorId]);

  // Update selected seat when seats query refetches
  React.useEffect(() => {
    if (selectedSeat && seats) {
      const updated = seats.find((s) => s.id === selectedSeat.id);
      if (updated) {
        setSelectedSeat(updated);
      }
    }
  }, [seats, selectedSeat]);

  const handleCreateSeat = async (data: any) => {
    try {
      await createSeatMutation.mutateAsync(data);
      toast({
        title: "Seat Created",
        description: "Successfully added seat to the floor plan.",
        type: "success",
      });
      setCreateSeatOpen(false);
    } catch (err: any) {
      toast({
        title: "Action Failed",
        description: err.message || "Failed to create seat.",
        type: "error",
      });
    }
  };

  const handleUpdateSeat = async (data: any) => {
    try {
      await updateSeatMutation.mutateAsync(data);
      toast({
        title: "Seat Updated",
        description: "Successfully updated seat properties.",
        type: "success",
      });
      setEditSeatOpen(false);
    } catch (err: any) {
      toast({
        title: "Action Failed",
        description: err.message || "Failed to update seat.",
        type: "error",
      });
    }
  };

  const handleDeleteSeat = async (id: number) => {
    if (!confirm("Are you sure you want to delete this seat? All allocation histories will be removed.")) return;
    try {
      await deleteSeatMutation.mutateAsync(id);
      toast({
        title: "Seat Deleted",
        description: "Successfully removed seat from the system.",
        type: "success",
      });
      setSelectedSeat(null);
    } catch (err: any) {
      toast({
        title: "Action Failed",
        description: err.message || "Failed to delete seat.",
        type: "error",
      });
    }
  };

  const handleAllocateSeat = async (data: any) => {
    try {
      await allocateMutation.mutateAsync({
        seat_id: selectedSeat.id,
        employee_id: data.employee_id,
        allocation_type: data.allocation_type,
        effective_date: data.effective_date,
      });

      toast({
        title: "Seat Allocated",
        description: "Successfully assigned employee to this workspace.",
        type: "success",
      });
      setAllocateOpen(false);
    } catch (err: any) {
      toast({
        title: "Allocation Failed",
        description: err.message || "Failed to allocate seat.",
        type: "error",
      });
    }
  };

  const handleReleaseSeat = async (data: any) => {
    try {
      await releaseMutation.mutateAsync({
        reason: data.reason,
        notes: data.notes,
      });

      toast({
        title: "Seat Released",
        description: "Successfully vacated workspace assignment.",
        type: "success",
      });
      setReleaseOpen(false);
    } catch (err: any) {
      toast({
        title: "Release Failed",
        description: err.message || "Failed to vacate seat.",
        type: "error",
      });
    }
  };

  const getSeatStatusStyle = (status: string) => {
    switch (status) {
      case "available":
        return "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100/50 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30";
      case "occupied":
        return "bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100/50 dark:bg-indigo-950/20 dark:text-indigo-400 dark:border-indigo-900/30";
      case "maintenance":
        return "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100/50 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/30";
      default:
        return "bg-zinc-50 text-zinc-600 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700";
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-white">Workspace Layouts</h2>
          <p className="text-zinc-500 dark:text-zinc-400">
            Interactive floor plan mapping, seat status configuration, and assignments
          </p>
        </div>
        <Button
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white"
          onClick={() => setCreateSeatOpen(true)}
        >
          <Plus className="h-4 w-4" />
          Add Workspace Seat
        </Button>
      </div>

      {/* Buildings & Floor Selectors */}
      <Card className="border-zinc-200/80 shadow-sm dark:border-zinc-800">
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-center gap-6">
            {/* Buildings Tabs */}
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-zinc-400 shrink-0" />
              <div className="flex flex-wrap items-center gap-1.5 bg-zinc-100 dark:bg-zinc-800/80 p-1 rounded-lg">
                {buildingsLoading ? (
                  <span className="text-xs text-zinc-500 px-3">Loading...</span>
                ) : (
                  buildings?.map((b) => (
                    <button
                      key={b.id}
                      onClick={() => {
                        setSelectedBuildingId(b.id);
                        setSelectedSeat(null);
                      }}
                      className={cn(
                        "px-3 py-1.5 text-xs font-semibold rounded-md transition-all",
                        selectedBuildingId === b.id
                          ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-sm"
                          : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
                      )}
                    >
                      {b.name}
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* Floors Selector */}
            <div className="flex items-center gap-2">
              <Layers className="h-5 w-5 text-zinc-400 shrink-0" />
              <div className="flex flex-wrap items-center gap-1.5 bg-zinc-100 dark:bg-zinc-800/80 p-1 rounded-lg">
                {floorsLoading ? (
                  <span className="text-xs text-zinc-500 px-3">Loading floors...</span>
                ) : floors && floors.length > 0 ? (
                  floors.map((f) => (
                    <button
                      key={f.id}
                      onClick={() => {
                        setSelectedFloorId(f.id);
                        setSelectedSeat(null);
                      }}
                      className={cn(
                        "px-3 py-1.5 text-xs font-semibold rounded-md transition-all",
                        selectedFloorId === f.id
                          ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-sm"
                          : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
                      )}
                    >
                      Floor {f.floor_number}
                    </button>
                  ))
                ) : (
                  <span className="text-xs text-zinc-400 px-3">No floors added</span>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Main Seat Grid (Left Pane) */}
        <Card className="lg:col-span-2 border-zinc-200/80 shadow-sm dark:border-zinc-800">
          <CardHeader>
            <CardTitle>Seat Map Grid</CardTitle>
            <CardDescription>Visual arrangement of workspaces and active states</CardDescription>
          </CardHeader>
          <CardContent>
            {seatsLoading ? (
              <div className="h-64 flex items-center justify-center text-zinc-500">Loading seat map...</div>
            ) : seats && seats.length > 0 ? (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3.5">
                {seats.map((seat) => {
                  const isSelected = selectedSeat?.id === seat.id;
                  return (
                    <button
                      key={seat.id}
                      onClick={() => setSelectedSeat(seat)}
                      className={cn(
                        "h-16 flex flex-col items-center justify-center rounded-xl border text-center transition-all duration-200 relative outline-none",
                        getSeatStatusStyle(seat.status),
                        isSelected && "ring-2 ring-indigo-500 ring-offset-2 dark:ring-offset-zinc-950 scale-[1.03]"
                      )}
                    >
                      <span className="text-xs font-mono font-bold uppercase">{seat.seat_code}</span>
                      <span className="text-[10px] opacity-75 capitalize font-medium">{seat.seat_type}</span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="h-48 flex items-center justify-center text-zinc-400">
                No seats mapped to this floor layout yet.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Seat Profile Info (Right Pane) */}
        <Card className="lg:col-span-1 border-zinc-200/80 shadow-sm dark:border-zinc-800">
          {selectedSeat ? (
            <>
              <CardHeader className="border-b border-zinc-100 dark:border-zinc-800 pb-6">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Workspace Details</CardTitle>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setEditSeatOpen(true)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-red-600 hover:text-red-700"
                      onClick={() => handleDeleteSeat(selectedSeat.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-6 space-y-6">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-xs text-zinc-400">Seat Code</span>
                    <p className="font-semibold font-mono text-zinc-900 dark:text-white uppercase">{selectedSeat.seat_code}</p>
                  </div>
                  <div>
                    <span className="text-xs text-zinc-400">Workspace Type</span>
                    <p className="font-semibold text-zinc-900 dark:text-white capitalize">{selectedSeat.seat_type}</p>
                  </div>
                  <div>
                    <span className="text-xs text-zinc-400">Location</span>
                    <p className="font-semibold text-zinc-900 dark:text-white">F{selectedSeat.floor?.floor_number ?? selectedSeat.floor_number}, {selectedSeat.building?.name || selectedSeat.building_name}</p>
                  </div>
                  <div>
                    <span className="text-xs text-zinc-400">Status</span>
                    <p className="font-semibold capitalize text-zinc-900 dark:text-white">{selectedSeat.status}</p>
                  </div>
                </div>

                {/* Assignment Block */}
                <div className="border-t border-zinc-100 dark:border-zinc-800 pt-6 space-y-4">
                  <h4 className="text-sm font-semibold text-zinc-900 dark:text-white">Current Occupancy</h4>

                  {selectedSeat.status === "occupied" && selectedSeat.current_allocation ? (
                    <div className="rounded-xl border border-indigo-100 dark:border-indigo-950/40 bg-indigo-50/20 dark:bg-indigo-950/10 p-4 space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-xs">
                          {selectedSeat.current_allocation.employee.first_name[0]}
                          {selectedSeat.current_allocation.employee.last_name[0]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-zinc-950 dark:text-white truncate">
                            {selectedSeat.current_allocation.employee.first_name} {selectedSeat.current_allocation.employee.last_name}
                          </p>
                          <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                            {selectedSeat.current_allocation.employee.department}
                          </p>
                        </div>
                      </div>
                      <div className="text-xs text-zinc-500 space-y-1">
                        <p>Type: <span className="font-medium text-zinc-700 dark:text-zinc-300 capitalize">{selectedSeat.current_allocation.allocation_type}</span></p>
                        <p>Assigned since: <span className="font-medium text-zinc-700 dark:text-zinc-300">{selectedSeat.current_allocation.effective_date}</span></p>
                      </div>
                      <Button
                        variant="outline"
                        className="w-full flex items-center gap-1.5 text-red-600 border-red-200/80 hover:bg-red-50 dark:border-red-950/40 dark:hover:bg-red-950/20 text-xs"
                        onClick={() => setReleaseOpen(true)}
                      >
                        <UserX className="h-4 w-4" />
                        Release Workspace
                      </Button>
                    </div>
                  ) : selectedSeat.status === "maintenance" ? (
                    <div className="flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-200">
                      <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
                      <div>
                        <p className="font-semibold">Workspace Under Maintenance</p>
                        <p className="opacity-95">
                          This seat is currently offline. Change status to "available" to resume allocation operations.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-xs text-zinc-500">
                        <CheckCircle className="h-4 w-4 text-emerald-500" />
                        <span>Workspace is ready and available for assignment.</span>
                      </div>
                      <Button
                        className="w-full flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white"
                        onClick={() => setAllocateOpen(true)}
                      >
                        <UserCheck className="h-4 w-4" />
                        Assign Employee
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </>
          ) : (
            <div className="p-12 text-center text-zinc-500 flex flex-col items-center justify-center gap-2">
              <HelpCircle className="h-10 w-10 text-zinc-400" />
              <p className="text-sm font-semibold">No Workspace Selected</p>
              <p className="text-xs max-w-[200px]">Click any seat block in the grid layout to inspect or manage its occupancy.</p>
            </div>
          )}
        </Card>
      </div>

      {/* Add seat dialog */}
      <FormDialog
        isOpen={createSeatOpen}
        onOpenChange={setCreateSeatOpen}
        title="Add New Workspace Seat"
        description="Configure a new workspace code, type, and target floor."
      >
        <SeatForm onSubmit={handleCreateSeat} isLoading={createSeatMutation.isPending} />
      </FormDialog>

      {/* Edit seat dialog */}
      <FormDialog
        isOpen={editSeatOpen}
        onOpenChange={(open) => {
          setEditSeatOpen(open);
          if (!open) setSelectedSeat(null);
        }}
        title="Edit Seat Configuration"
        description="Update status (available, maintenance) or seat location profile."
      >
        {selectedSeat && (
          <SeatForm
            initialData={selectedSeat}
            onSubmit={handleUpdateSeat}
            isLoading={updateSeatMutation.isPending}
          />
        )}
      </FormDialog>

      {/* Allocate seat manually dialog */}
      <FormDialog
        isOpen={allocateOpen}
        onOpenChange={setAllocateOpen}
        title="Assign Employee to Seat"
        description="Select an active employee to allocate to this specific workspace."
      >
        <AllocationForm onSubmit={handleAllocateSeat} isLoading={allocateMutation.isPending} />
      </FormDialog>

      {/* Vacate/Release seat dialog */}
      <FormDialog
        isOpen={releaseOpen}
        onOpenChange={setReleaseOpen}
        title="Release Workspace"
        description="Confirm releasing this seat assignment. Please state a vacancy reason."
      >
        <ReleaseForm onSubmit={handleReleaseSeat} isLoading={releaseMutation.isPending} />
      </FormDialog>
    </div>
  );
}
