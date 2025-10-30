import { IsString } from 'class-validator';

export class AddAgentDto {
    @IsString()
    agentId: string;
}
