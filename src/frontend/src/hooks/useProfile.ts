import { createActor } from "@/backend";
import type { Profile } from "@/backend";
import type { Role } from "@/backend";
import { useActor } from "@caffeineai/core-infrastructure";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export function useGetMyProfile() {
  const { actor, isFetching: actorFetching } = useActor(createActor);

  const query = useQuery<Profile | null>({
    queryKey: ["myProfile"],
    queryFn: async () => {
      if (!actor) throw new Error("Actor not available");
      return actor.getMyProfile();
    },
    enabled: !!actor && !actorFetching,
    retry: false,
  });

  return {
    ...query,
    isLoading: actorFetching || query.isLoading,
    isFetched: !!actor && query.isFetched,
  };
}

export function useSaveProfile() {
  const { actor } = useActor(createActor);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      name: string;
      role: Role;
      faceImageUrl: string;
    }) => {
      if (!actor) throw new Error("Actor not available");
      await actor.saveProfile(data.name, data.role, data.faceImageUrl);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["myProfile"] });
    },
  });
}
