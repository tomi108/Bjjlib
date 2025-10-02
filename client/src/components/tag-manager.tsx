import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Tag } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Plus, Tags, Edit2, Trash2, GripVertical, Info } from "lucide-react";

interface TagManagerProps {
  onTagsChanged: () => void;
  tags: Tag[];
}

export function TagManager({ onTagsChanged, tags }: TagManagerProps) {
  const [newTagName, setNewTagName] = useState("");
  const [editingTag, setEditingTag] = useState<{ id: string; name: string } | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const createTagMutation = useMutation({
    mutationFn: async (name: string) => {
      const response = await apiRequest("POST", "/api/tags", { name });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Tag created",
        description: "The tag has been added successfully",
      });
      setNewTagName("");
      onTagsChanged();
      queryClient.invalidateQueries({ queryKey: ["/api/tags"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error creating tag",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateTagMutation = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const response = await apiRequest("PUT", `/api/tags/${id}`, { name });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Tag updated",
        description: "The tag has been updated successfully",
      });
      setEditingTag(null);
      onTagsChanged();
      queryClient.invalidateQueries({ queryKey: ["/api/tags"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error updating tag",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteTagMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/tags/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Tag deleted",
        description: "The tag has been removed from all videos",
      });
      onTagsChanged();
      queryClient.invalidateQueries({ queryKey: ["/api/tags"] });
      queryClient.invalidateQueries({ queryKey: ["/api/videos"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error deleting tag",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleAddTag = () => {
    if (newTagName.trim()) {
      createTagMutation.mutate(newTagName.trim());
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingTag && editingTag.name.trim()) {
      updateTagMutation.mutate({
        id: editingTag.id,
        name: editingTag.name.trim(),
      });
    }
  };

  const handleDeleteTag = (id: string) => {
    deleteTagMutation.mutate(id);
  };

  return (
    <Card className="shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-xl font-bold flex items-center gap-2">
          Manage Tags
          <Tags className="w-5 h-5 text-accent" />
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Add New Tag */}
        <div className="flex gap-2">
          <Input
            placeholder="New tag name..."
            value={newTagName}
            onChange={(e) => setNewTagName(e.target.value)}
            onKeyPress={handleKeyPress}
            data-testid="input-new-tag"
          />
          <Button
            onClick={handleAddTag}
            disabled={!newTagName.trim() || createTagMutation.isPending}
            data-testid="button-add-new-tag"
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>

        {/* Existing Tags List */}
        <div className="border border-border rounded-lg divide-y divide-border max-h-96 overflow-y-auto">
          {tags.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground">
              <Tags className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>No tags yet. Add your first tag above.</p>
            </div>
          ) : (
            tags.map(tag => (
              <div key={tag.id} className="flex items-center justify-between p-3 hover:bg-muted/5 transition-colors">
                <div className="flex items-center gap-3">
                  <GripVertical className="w-4 h-4 text-muted-foreground" />
                  {editingTag?.id === tag.id ? (
                    <form onSubmit={handleEditSubmit} className="flex items-center gap-2">
                      <Input
                        value={editingTag.name}
                        onChange={(e) => setEditingTag({ ...editingTag, name: e.target.value })}
                        className="h-8 text-sm"
                        autoFocus
                        data-testid={`input-edit-tag-${tag.id}`}
                      />
                      <Button type="submit" size="sm" data-testid={`button-save-tag-${tag.id}`}>
                        Save
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingTag(null)}
                        data-testid={`button-cancel-edit-tag-${tag.id}`}
                      >
                        Cancel
                      </Button>
                    </form>
                  ) : (
                    <>
                      <Badge variant="secondary" data-testid={`badge-tag-${tag.id}`}>
                        {tag.name}
                      </Badge>
                      <span className="text-xs text-muted-foreground" data-testid={`text-tag-count-${tag.id}`}>
                        {tag.videoCount} videos
                      </span>
                    </>
                  )}
                </div>
                
                {editingTag?.id !== tag.id && (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingTag({ id: tag.id, name: tag.name })}
                      data-testid={`button-edit-tag-${tag.id}`}
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-muted-foreground hover:text-destructive"
                          data-testid={`button-delete-tag-${tag.id}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Tag</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete the tag "{tag.name}"? This will remove it from all {tag.videoCount} associated videos. This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDeleteTag(tag.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            data-testid={`button-confirm-delete-tag-${tag.id}`}
                          >
                            Delete Tag
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        <div className="bg-muted/10 border border-border rounded-lg p-3">
          <p className="text-xs text-muted-foreground flex items-start gap-2">
            <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
            Drag to reorder tags. Deleting a tag will remove it from all associated videos.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
