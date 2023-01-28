export const isConversationParticipant = (
  participants: any,
  userId: string
): boolean => {
  return !!participants.find(
    (participant: any) => participant.userId === userId
  );
};
