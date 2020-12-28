import assert = require('assert');
import * as DiscordJS from "discord.js";
const client = new DiscordJS.Client({ partials: ['MESSAGE', 'CHANNEL', 'REACTION'] });
import moment = require("moment");
import schedule = require('node-schedule');

let localConfig: any;
try {
    assert(localConfig = require("./localConfig"), "Failed loading config file");
} catch (e) {
    console.error(`${e}`);
    process.exit();
}

const debug = false;

const MongoClient = require('mongodb').MongoClient;
const db_name = debug ? localConfig.DB.TESTNAME : localConfig.DB.NAME;
const db_user = localConfig.DB.USER;
const db_pw = localConfig.DB.PW;
const url = `mongodb+srv://${db_user}:${db_pw}@bd-den.uvq1b.mongodb.net/${db_name}?retryWrites=true&w=majority`;

const prefix = localConfig.PREFIX;
const server_id = localConfig.SERVER;
let server: DiscordJS.Guild;

let channels = {
    main: <unknown>"accalia-main" as DiscordJS.TextChannel,
    level: <unknown>"📈level-up-log" as DiscordJS.TextChannel,
    accalia_logs: <unknown>"accalia-logs" as DiscordJS.TextChannel,
    logs: <unknown>"🎫logs" as DiscordJS.TextChannel,
    bad_words_log: <unknown>"🤬bad-words-log" as DiscordJS.TextChannel,
    reports_log: <unknown>"🚨reports-log" as DiscordJS.TextChannel,
    warnings: <unknown>"🚨warnings" as DiscordJS.TextChannel,
    cult_info: <unknown>"🗿cult-selection" as DiscordJS.TextChannel,
    char_sub: <unknown>"📃character-submission" as DiscordJS.TextChannel,
    char_archive: <unknown>"📚character-archive" as DiscordJS.TextChannel,
    char_index: <unknown>"📕character-index" as DiscordJS.TextChannel,
    reports: <unknown>"📮reports-and-issues" as DiscordJS.TextChannel,
    with_male: <unknown>"🍆with-male" as DiscordJS.TextChannel,
    with_female: <unknown>"🍑with-female" as DiscordJS.TextChannel,
    with_femboy: <unknown>"🍌with-femboy" as DiscordJS.TextChannel,
    with_furry: <unknown>"😺with-furry" as DiscordJS.TextChannel,
    with_beast: <unknown>"🦄with-beast" as DiscordJS.TextChannel,
    with_futa_herm: <unknown>"🥕with-futa" as DiscordJS.TextChannel,
    with_humanoid: <unknown>"👹with-humanoid" as DiscordJS.TextChannel,
    as_male: <unknown>"🍆as-male" as DiscordJS.TextChannel,
    as_female: <unknown>"🍑as-female" as DiscordJS.TextChannel,
    as_femboy: <unknown>"🍌as-femboy" as DiscordJS.TextChannel,
    as_furry: <unknown>"😺as-furry" as DiscordJS.TextChannel,
    as_beast: <unknown>"🦄as-beast" as DiscordJS.TextChannel,
    as_futa_herm: <unknown>"🥕as-futa" as DiscordJS.TextChannel,
    as_humanoid: <unknown>"👹as-humanoid" as DiscordJS.TextChannel,
    vanilla: <unknown>"🍦vanilla" as DiscordJS.TextChannel,
    gay: <unknown>"👬gay" as DiscordJS.TextChannel,
    lesbian: <unknown>"👭lesbian" as DiscordJS.TextChannel,
    extreme: <unknown>"☠extreme" as DiscordJS.TextChannel,
    group: <unknown>"👥group" as DiscordJS.TextChannel,
    long_term_plot: <unknown>"📰long-term-plot" as DiscordJS.TextChannel,
    gm_style: <unknown>"🧙gm-style" as DiscordJS.TextChannel,
    real_life: <unknown>"🤝real-life" as DiscordJS.TextChannel,
    all_style: <unknown>"✥all-style" as DiscordJS.TextChannel,
    breeding: <unknown>"🐇breeding" as DiscordJS.TextChannel,
    contact: <unknown>"💬ask-to-dm" as DiscordJS.TextChannel,
    general: <unknown>"🔞general" as DiscordJS.TextChannel,
    ooc_general: <unknown>"💬ooc-general" as DiscordJS.TextChannel,
    rp_general: <unknown>"🧚rp-general" as DiscordJS.TextChannel,
    nsfw_media: <unknown>"👅nsfw-media" as DiscordJS.TextChannel,
    nsfw_media_discussion: <unknown>"👄nsfw-media-discussion" as DiscordJS.TextChannel,
    nsfw_discussion: <unknown>"nsfw-discussion" as DiscordJS.TextChannel,
    tinkering: <unknown>"tinkering" as DiscordJS.TextChannel,
    authentication_logs: <unknown>"🎫authentication-logs" as DiscordJS.TextChannel,
    paranoia_plaza: <unknown>"🙈ashs-paranoia-plaza" as DiscordJS.TextChannel,
    invites: <unknown>"⚠invite-log" as DiscordJS.TextChannel,
    roles_selection: <unknown>"🎲roles-selection" as DiscordJS.TextChannel,
    reported_rps: <unknown>"☣reported-rp-ads" as DiscordJS.TextChannel,
    report_log: <unknown>"reported-lfp-warning-logs" as DiscordJS.TextChannel,
    lfp_moderation: <unknown>"🏷ad-moderation" as DiscordJS.TextChannel,
    lfp_info: <unknown>"📌posting-rules" as DiscordJS.TextChannel,
    rp_ad_feedback: <unknown>"🔖ad-feedback" as DiscordJS.TextChannel,
    extreme_definition: <unknown>"💀extreme-definition" as DiscordJS.TextChannel,
    promotion: <unknown>"🎈promotion" as DiscordJS.TextChannel,
};

let categories = {
    playing_with: <unknown>"LFP Playing With" as DiscordJS.CategoryChannel,
    playing_as: <unknown>"LFP Playing As" as DiscordJS.CategoryChannel,
    by_type: <unknown>"LFP By Type" as DiscordJS.CategoryChannel,
};

let roles = {
    No_Ping: <unknown>"DON'T PING⛔" as DiscordJS.Role,
    Newcomer: <unknown>"Newcomer" as DiscordJS.Role,
    CustomRoles: <unknown>"--Custom Roles--" as DiscordJS.Role,
    NSFW: <unknown>"NSFW" as DiscordJS.Role,
    Ask_to_dm: <unknown>"Ask to DM ⚠️" as DiscordJS.Role,
    DMs_closed: <unknown>"DMs Closed ⛔" as DiscordJS.Role,
    DMs_open: <unknown>"DMs Open ✔️" as DiscordJS.Role,
    Cult_leader: <unknown>"Cult Leader" as DiscordJS.Role,
    Extreme: <unknown>"Extreme" as DiscordJS.Role,
    WARN_1: <unknown>"Warned 1x" as DiscordJS.Role,
    WARN_2: <unknown>"Warned 2x" as DiscordJS.Role,
    INNOCENT: <unknown>"Innocent" as DiscordJS.Role,
    ANCIENT: <unknown>"💠Ancient Member" as DiscordJS.Role,
    STAFF: <unknown>"Staff" as DiscordJS.Role,
    TRIALMOD: <unknown>"Trial-Moderator" as DiscordJS.Role,
};

let emojis = {
    bancat: <unknown>"bancat" as DiscordJS.GuildEmoji,
    pingmad: <unknown>"pingmad" as DiscordJS.GuildEmoji,
    pingangry: <unknown>"pingangry" as DiscordJS.GuildEmoji,
};

let lvl_roles = {
    LVL_0: <unknown>"Lewd (Lvl 0+)" as DiscordJS.Role,
    LVL_5: <unknown>"Pervert (Lvl 5+)" as DiscordJS.Role,
    LVL_10: <unknown>"Tainted (Lvl 10+)" as DiscordJS.Role,
    LVL_20: <unknown>"Slut (Lvl 20+)" as DiscordJS.Role,
    LVL_30: <unknown>"Whore (Lvl 30+)" as DiscordJS.Role,
    LVL_40: <unknown>"Cumdump (Lvl 40+)" as DiscordJS.Role,
    LVL_50: <unknown>"Pornstar (Lvl 50+)" as DiscordJS.Role,
    LVL_60: <unknown>"Sex-Toy (Lvl 60+)" as DiscordJS.Role,
    LVL_70: <unknown>"Server Bus (Lvl 70+)" as DiscordJS.Role,
    LVL_80: <unknown>"Doesn't leave bed (Lvl 80+)" as DiscordJS.Role,
    LVL_90: <unknown>"Sperm Bank (Lvl 90+)" as DiscordJS.Role,
    LVL_100: <unknown>"Retired Pornstar (Lvl 100+)" as DiscordJS.Role,
};

type LFP_Timer = {
    [key: string]: NodeJS.Timeout
}
let lfpTimer: LFP_Timer = {};
let lfpChannels: DiscordJS.TextChannel[] = [];
let lockdown = false;
let disableMentions = true;
let ping_violation_reaction_emoji = emojis.pingangry;
const level_up_module = "Level roles";
const link_regex = /((https?|ftp):\/\/|www\.)(\w.+\w\W?)/g; //source: https://support.discordapp.com/hc/en-us/community/posts/360036244152-Change-in-text-link-detection-RegEx
type Invite_code = string;
class Invites extends DiscordJS.Collection<Invite_code, {uses: number | null, maxUses?: number | null, inviter?: DiscordJS.User | null}>{};
let invites: Invites;

function timeout(ms: number) {
    return new Promise<string>(resolve => setTimeout(resolve, ms));
}

async function trywait(promise: Promise<any>, time_ms: number) {
    const result = await Promise.race([promise, new Promise<string>(resolve => setTimeout(resolve, time_ms, "timeout"))]);
    return result !== "timeout";
}

const dbMod = {
    warnUser: function (member: DiscordJS.User, level: number, warner: DiscordJS.GuildMember, reason?: string) {
        util.log(`Calling DB Module`, 'DB/warnUser', util.logLevel.INFO);
        try {
            util.log(`Attempting to connect to DB`, 'DB/warnUser', util.logLevel.INFO);
            this.connect( function(db: any) {
                util.log(`Successfully established DB Connection`, 'DB/warnUser', util.logLevel.INFO);
                let warnings = db.collection('warnings');
                let warnedUser = {
                    id: member.id,
                    currName: member.username,
                    formerName: member.username,
                    level: level,
                    reason: reason,
                    warnedAt: new Date(Date.now())
                };

                warnings.findOne({ id: member.id })
                    .then((userFound: any) => {
                        if (userFound == null) return;
                        warnedUser.formerName = userFound.formerName;
                        level = userFound.level+1;
                        // TODO: REPLACE FORMERNAME AND LEVEL IF EXISTS IN DB --> PREREQUISITE: SCHEDULED WARNING DELETION
                    })
                    .catch((err: any) => {
                        util.log(`Failed to do command warning (findOneAndUpdate): ${err}.`, 'DB/warnUser', util.logLevel.FATAL);
                    });

                util.log(`Attempting updating/inserting warning for ${member}`, 'DB/warnUser', util.logLevel.INFO);
                // Upsert command
                warnings.findOneAndUpdate(
                    { id: member.id },
                    { $set: warnedUser },
                    { upsert: true, returnOriginal: true }
                )
                    .then(() => {
                        util.log(`Successfully added/updated warning for ${member} (lvl ${level})`, 'DB/warnUser', util.logLevel.INFO);
                        let dateFormat = 'Do MMMM YYYY';
                        let warnDate = [
                            moment(new Date(Date.now() + 1000 * 60 * 60 * 24 * 14)).format(dateFormat) + " (14 Days)",
                            moment(new Date(Date.now() + 1000 * 60 * 60 * 24 * 30)).format(dateFormat) + " (30 Days)",
                            'indefinite'
                        ];
                        let lvlMsg = ['1st Warning', '2nd Warning', '3rd Warning'];
                        let expirationMsg = [
                            `in 2 weeks.`,
                            `in 1 month.`,
                            `whenever the staff team decides for it.`
                        ];

                        member.send(`You have been given a Level ${level} warning in the server **${server.name}** with reason: '${reason}'\n`+
                            `This warning expires ${expirationMsg[level-1]}`);

                        util.log(`warned: ${member} (${level-1}->${level})`, "warn", util.logLevel.INFO);

                        util.sendTextMessage(channels.warnings,
                            `${member} | **${lvlMsg[level-1]}**\n`+
                            `__Reason:__ ${reason || 'Not specified'} (Warned by ${warner})\n` +
                            `__When:__ ${moment().format(dateFormat)}\n`+
                            `__Ends:__ ${warnDate[level-1]}\n`+
                            `-------------------`
                        );
                    })
                    .catch((err: any) => {
                        util.log(`Failed to do command warning (findOneAndUpdate): ${err}.`, 'DB/warnUser', util.logLevel.FATAL);
                    });
            });
        } catch (err) {
            util.log('Failed to do "warnUser": ' + err, 'DB/warnUser', util.logLevel.FATAL);
        }
    },
    checkWarnings: function () {
        util.log(`Calling DB Module`, 'DB/checkWarnings', util.logLevel.INFO);
        try {
            return;
            util.log(`Attempting to connect to DB`, 'DB/checkWarnings', util.logLevel.INFO);
            this.connect( function(db: any) {
                let warnings = db.collection('warnings');
                warnings.findAll()
                    .then(() => {
                        //util.log(`Successfully added/updated warning for ${member} (lvl ${level})`, 'DB/warnUser', util.logLevel.INFO);

                    })
                    .catch((err: any) => {
                        util.log(`Failed to do command warning (findOneAndUpdate): ${err}.`, 'DB/warnUser', util.logLevel.FATAL);
                    });
            });
        } catch (err) {
            util.log('Failed to do "checkWarnings":' + err, 'DB/checkWarnings', util.logLevel.FATAL);
        }
    },
    connect: function (callback: (db: any) => any) {
        MongoClient.connect(url, { useNewUrlParser: true }, (err: any, client: any) => {
            if (err) util.log(err, 'DB/connect', util.logLevel.FATAL);
            else {
                const db = client.db(db_name);
                callback(db);
            }
            client.close();
        });
    }
};

async function fetch_invites() {
    assert(server.available, "Server unavailable");
    let retval = new Invites();
    for (const [, invite] of await server.fetchInvites()) {
        retval.set(invite.code, invite);
    }
    try {
        const vanity_data = await server.fetchVanityData();
        if (server.vanityURLCode) {
            retval.set(vanity_data.code, {uses: vanity_data.uses});
        }
    }
    catch (error) {}
    return retval;
}

async function delete_all_rp_ads(member: DiscordJS.GuildMember | DiscordJS.PartialGuildMember) {
    for (const lfp_channel of lfpChannels) {
        lfp_channel.messages.cache.find((message) => message.author.id === member.id)?.delete();
    }
}

const startUpMod = {
    initialize: function (startUpMessage:string) {
        try {
            server = <DiscordJS.Guild>client.guilds.resolve(server_id);
            assert(server);
            server.fetch().then(async guild => {
                server = guild;
                fnct.serverStats(['users', 'online', 'new', 'bots', 'roles', 'channels', 'age']);
            });
            for (const key in channels) {
                const channel_name = <string>((channels as any)[key]);
                assert((channels as any)[key] = server.channels.cache.find(ch => ch.name === channel_name), `failed finding channel ${channel_name}`);
                assert((channels as any)[key] instanceof DiscordJS.TextChannel, `Failed initializing channels because ${(channels as any)[key]} is not a channel`);
            }
            for (const key in categories) {
                const category_name = <string>((categories as any)[key]);
                assert((categories as any)[key] = server.channels.cache.find(ch => ch.name === category_name), `failed finding category channel ${category_name}`);
                assert((categories as any)[key] instanceof DiscordJS.CategoryChannel, `Failed initializing category channels because ${(categories as any)[key]} is not a category channel`);
            }
            for (const key in roles) {
                const role_name = <string>((roles as any)[key]);
                assert((roles as any)[key] = server.roles.cache.find(ch => ch.name === role_name), `failed finding role ${role_name}`);
                assert((roles as any)[key] instanceof DiscordJS.Role, `Failed initializing roles because ${(roles as any)[key]} is not a role`);
            }
            for (const key in emojis) {
                const emoji_name = <string>((emojis as any)[key]);
                assert((emojis as any)[key] = server.emojis.cache.find(ch => ch.name === emoji_name), `failed finding emoji ${emoji_name}`);
                assert((emojis as any)[key] instanceof DiscordJS.GuildEmoji, `Failed initializing emojis because ${(emojis as any)[key]} is not an emoji`);
            }
            for (const key in lvl_roles) {
                const role_name = <string>((lvl_roles as any)[key]);
                assert((lvl_roles as any)[key] = server.roles.cache.find(ch => ch.name === role_name), `failed finding level role ${role_name}`);
                assert((lvl_roles as any)[key] instanceof DiscordJS.Role, `Failed initializing level roles because ${(roles as any)[key]} is not a role`);
            }

            if (!client.user) {
                throw "I don't know what's happening";
            }
            client.user.setActivity("Serving the Den").catch(error => console.error(`${error}`));
            ping_violation_reaction_emoji = (emojis as any)[<string><unknown>ping_violation_reaction_emoji];

            util.sendTextMessage(channels.main, startUpMessage);
            util.log("INITIALIZED.", "Startup", util.logLevel.INFO);

            lfpChannels.push(channels.with_male);
            lfpChannels.push(channels.with_female);
            lfpChannels.push(channels.with_femboy);
            lfpChannels.push(channels.with_furry);
            lfpChannels.push(channels.with_beast);
            lfpChannels.push(channels.with_futa_herm);
            lfpChannels.push(channels.with_humanoid);
            lfpChannels.push(channels.as_male);
            lfpChannels.push(channels.as_female);
            lfpChannels.push(channels.as_femboy);
            lfpChannels.push(channels.as_furry);
            lfpChannels.push(channels.as_beast);
            lfpChannels.push(channels.as_futa_herm);
            lfpChannels.push(channels.as_humanoid);
            lfpChannels.push(channels.all_style);
            lfpChannels.push(channels.vanilla);
            lfpChannels.push(channels.gay);
            lfpChannels.push(channels.lesbian);
            lfpChannels.push(channels.extreme);
            lfpChannels.push(channels.group);
            lfpChannels.push(channels.long_term_plot);
            lfpChannels.push(channels.gm_style);
            lfpChannels.push(channels.real_life);
            lfpChannels.push(channels.breeding);

            for (const lfpchannel of lfpChannels) {
                lfpchannel.messages.fetch({ "limit": 100 });
            }

            fetch_invites().then(invs => invites = invs);

            server.members.fetch();

            this.startSchedules();

        } catch (e) {
            console.log(`(${moment().format('MMM DD YYYY - HH:mm:ss.SSS')}) Failed to start up because ${e}.`);
            process.exit();
        }
    },
    startSchedules: function () {
        // Cron-format: second 0-59 optional; minute 0-59; hour 0-23; day of month 1-31; month 1-12; day of week 0-7
        let j = schedule.scheduleJob('*/60 * * * *', function(fireDate){
            cmd.cn(null as unknown as DiscordJS.Message);
        });
    }
};

client.on("ready", () => {
    startUpMod.initialize("I'M AWAKE! AWOOO~");

    //Catch up on missed level-ups
    if (!(channels.level instanceof DiscordJS.TextChannel)) {
        return;
    }
    channels.level.messages.fetch({ "limit": 100 })
    .then(messages => {
        //Remove duplicates so that when someone levels from lvl 3 to 4 and lvl 4 to 5 it doesn't trigger 2 level-up handles
        let seen_users = new DiscordJS.Collection<DiscordJS.Snowflake, DiscordJS.Message>();
        messages.sort((left, right) => right.createdTimestamp - left.createdTimestamp); //newest to oldest
        messages.forEach(message => {
            const id = message.mentions.members?.first()?.id;
            if (id && !seen_users.get(id)) {
                seen_users.set(id, message);
            }
        });
        //Handle level ups that we may have missed
        seen_users.forEach(util.handle_level_up);
    })
    .catch(error => {
        util.log(`Failed reading old messages from ${channels.level} because of ${error}`, level_up_module, util.logLevel.ERROR);
    });
});

const process_member_join = async (member: DiscordJS.GuildMember | DiscordJS.PartialGuildMember, invs: Invites) => {
    const invitee_is_new = new Date().getTime() - (client.users.cache.get(member.id)?.createdTimestamp || 0) < 1000 * 60 * 60 * 24;
    const invitee_str = `${member} ` +
        `(${member.user?.username}#${member.user?.discriminator})` +
        `${invitee_is_new ? `(:warning: new account from ${util.time(new Date().getTime() - (member.user?.createdTimestamp || 0))} ago)` : ""}`;
    let inv_string = "";
    for (const [old_code, old_invite] of invites) {
        let curr = "";
        const new_invite = invs.get(old_code);
        const old_uses = old_invite.uses || 0;
        let new_uses = 0;
        let expired = false;
        if (new_invite && new_invite.uses) {
            new_uses = new_invite.uses;
        }
        else { //the invite is gone because it expired because its last use was used up
            if (old_invite.maxUses && old_invite.uses === old_invite.maxUses - 1) {
                new_uses = old_invite.maxUses;
                expired = true;
            }
            else { //the invite expired for other reasons such as time
            }
        }
        if (new_uses > old_uses) {
            const inviter_guildmember = old_invite.inviter ? (server.members.cache.get(old_invite.inviter.id) || await server.members.fetch(old_invite.inviter.id)) : undefined;
            const inviter_has_left = inviter_guildmember === undefined;
            const inviter_is_recent = inviter_guildmember ? (new Date().getTime() - (inviter_guildmember.joinedTimestamp || 0) < 1000 * 60 * 60 * 24) : false;
            const inviter_age = util.time(new Date().getTime() - (inviter_guildmember?.joinedTimestamp || 0));
            const inviter_recent_string = inviter_is_recent ? `(:warning: who joined ${inviter_age} ago) ` : "";
            if (old_invite.inviter) {
                curr += `${invitee_str} **joined**; Invited by\n` +
                `${old_invite.inviter} ` + `(${old_invite.inviter.username}#${old_invite.inviter.discriminator}) ` + inviter_recent_string +
                `${inviter_has_left ? "who already left " : ""}(**${new_uses}** invite(s) on ${expired ? "expired " : ""}code **${old_code}**)\n`;
            }
            else {
                curr += `${invitee_str} **joined** (**${new_uses}** invite(s) on code **${old_code}**)\n`;
            }
        }
        if (new_uses > old_uses + 1) {
            curr += `Sorry, I missed ${new_uses - old_uses - 1} join(s) invited by ${old_invite.inviter}, should be people below this message.\n`;
        }
        inv_string += curr;
    }
    return inv_string;
}

async function member_check(member_: DiscordJS.GuildMember | DiscordJS.PartialGuildMember) {
    const member = member_ instanceof DiscordJS.GuildMember ? member_ : await member_.fetch();
    const banned_names = ["jonathan galindo", "nigga", "nigger"];
    if (banned_names.find(name => (member.user.username.toLocaleLowerCase().indexOf(name) !== -1) || (member.displayName.toLocaleLowerCase().indexOf(name) !== -1))) {
        util.sendTextMessage(channels.warnings, `Banned ${member} for having disallowed name/nickname (${member.user.username}/${member.displayName}).`);
        member.ban({reason: `Name contained bad phrase`});
    }
}

client.on("channelCreate", channel => {
    if (channel instanceof DiscordJS.TextChannel) {
        channel.setNSFW(true, `Channel creation default NSFW`);
    }
});

client.on("guildMemberAdd", (member) => {
    if (member.guild?.id !== server.id) { //ignore non-main servers
        return;
    }
    const invite_channel = <DiscordJS.TextChannel>channels.invites;
    fetch_invites()
    .then(async invs => {
        const inv_string = await process_member_join(member, invs);
        if (inv_string === "") {
            setTimeout(() => {
                fetch_invites()
                .then(async invs => {
                    const invitee_str = `${member}(${member.user?.username}#${member.user?.discriminator})`;
                    const inv_string = await process_member_join(member, invs) || `I can't figure out how ${invitee_str} joined the server.`;
                    invite_channel.send(new DiscordJS.MessageEmbed().setDescription(inv_string));
                    invites = invs;
                });
            }, 1000);
        }
        else {
            invite_channel.send(new DiscordJS.MessageEmbed().setDescription(inv_string));
            invites = invs;
        }
    });
    fnct.serverStats(['users', 'online', 'new']);
    member_check(member);
});

client.on("inviteCreate", invite => {
    invites.set(invite.code, invite);
});

client.on("guildMemberRemove", (member) => {
    fnct.serverStats(['users', 'online', 'new']);
    delete_all_rp_ads(member);
});

client.on("guildUpdate", (oldGuild, newGuild) => {
    fnct.serverStats(['users', 'online', 'new', 'bots', 'roles', 'channels', 'age']);
});

function get_ad_report(message: DiscordJS.Message, user: DiscordJS.User | DiscordJS.PartialUser) {
    return new DiscordJS.MessageEmbed()
    .setDescription(message.content)
    .addField("Details",
    `Channel: ${message.channel}\n` +
    `Post author: ${message.author}\n` +
    `Reported by: ${user}\n` +
    `${message.deleted ? "~~Link to ad~~ (deleted)" : `[Link to ad](${message.url})`}\n` +
    `${channels.lfp_moderation}`)
    .setFooter(`${message.channel.id}/${message.id}`)
    .setTimestamp(new Date().getTime());
}

async function remove_own_reactions(message: DiscordJS.Message) {
    for (const [id, reaction] of message.reactions.cache) {
        if (reaction.me) {
            await reaction.users.fetch(); //need to do this, otherwise reaction.users is empty
            for (const [id] of reaction.users.cache) {
                if (id === client.user?.id) {
                    reaction.users.remove(id);
                    break;
                }
            }
        }
    }
}

client.on('messageReactionAdd', async (messagereaction, user) => {
    if (user === client.user) return;
    if (!(user instanceof DiscordJS.User)) {
        user = await client.users.fetch(user.id);
    }
    if (messagereaction.partial) {
        try {
            await messagereaction.fetch();
        } catch (e) {
            util.log(`Failed to fetch reaction ${messagereaction} from ${user} in ${messagereaction.message.channel}`, `messageReactionAdd`, util.logLevel.WARN);
            return;
        }
    }
    if (messagereaction.message.guild?.id !== server.id) return;
    const reaction = messagereaction.emoji.name;
    if (messagereaction.emoji instanceof DiscordJS.GuildEmoji) return;
    if (reaction === "⭐" || reaction === "✅") {
        fnct.approveChar(messagereaction.message, messagereaction.emoji, user);
    }
    if (user.id === client.user?.id) return; //don't react to our own reactions
    //check if it's in an LFP channel
    const channel = messagereaction.message.channel;
    if (!(channel instanceof DiscordJS.TextChannel)) return;
    if (!channel.parent) return;
    if (reaction === "❌" && lfpChannels.reduce((found, lfp_channel) => found || lfp_channel.id === channel.id, false)) { //RP ad got flagged
        //no self-reports
        if (messagereaction.message.author.id === client.user?.id) return;
        //check that we haven't already handled it
        if (messagereaction.me) return;
        //place own reaction
        await util.react(messagereaction.message, "❌");
        //make report
        const report_message = await channels.reported_rps.send(get_ad_report(messagereaction.message, user));
        let images: string[] = [];
        messagereaction.message.embeds.forEach(emb => {
            if (emb.url) images.push(emb.url);
        });
        messagereaction.message.attachments.forEach(attachment => {
            images.push(attachment.url);
        });
        if (images.length) channels.reported_rps.send(images);
        if (channel.id !== channels.all_style.id) {
            await util.react(report_message, "✅");
            if (channel.id !== channels.extreme.id) await util.react(report_message, "☠");
            if (channel.id !== channels.real_life.id) await util.react(report_message, "🤝");
        }
        await util.react(report_message, "👶");
        await util.react(report_message, "❔");
        await util.react(report_message, "✋");
        await util.react(report_message, "🧨");
    }
    if (messagereaction.message.channel.id === channels.reported_rps.id) {
        if (!messagereaction.me) return;
        //get original ad
        const footer_text = messagereaction.message.embeds[0]?.footer?.text;
        if (!footer_text) return;
        const [channelID, messageID] = footer_text.split("/");
        const ad_channel = server.channels.cache.get(channelID);
        if (!ad_channel) return;
        if (!(ad_channel instanceof DiscordJS.TextChannel)) return;
        const message = await (async () => {
            try {
                return await ad_channel.messages.fetch(messageID);
            }
            catch (error) {
                return;
            }
        })();
        if (message) {
            //get context
            let playtype = "";
            if (ad_channel === channels.extreme) playtype = `for an extreme type roleplay`;
            else if (ad_channel === channels.as_furry) playtype = `to play as an anthro character`;
            else if (ad_channel.parent?.id === categories.playing_with.id) playtype = `to play with ${ad_channel.name.substr(7)} characters`;
            else if (ad_channel.parent?.id === categories.playing_as.id) playtype = `to play as a ${ad_channel.name.substr(5)} character`;
            else if (ad_channel === channels.real_life) playtype = `for real-life contacts`;
            else playtype = `for a ${ad_channel.name.substr(2)} type roleplay`;
            if (ad_channel === channels.group) {
                playtype += ` (more than 1 RP partner)`;
            }
            //get reporters
            let reporters = "";
            for (const [id, reaction] of message.reactions.cache) {
                if (reaction.emoji.name !== "❌") continue;
                await reaction.users.fetch();
                reporters = reaction.users.cache.reduce((curr, user) => {
                    if (user.id === client.user?.id) return curr;
                    return curr + `${user} `;
                }, "").trim();
            }
            const nickname = server.members.cache.get(user.id)?.displayName || user.username;
            //handle reaction
            switch (reaction) {
                case "✅": //founded report
                {
                    //delete original message
                    await message.delete({reason: "Founded LFP-ad-report"});
                    //yell at author
                    const template = `<@${message.author.id}>, your ad does not fit in ${ad_channel} because it doesn't explicitly look ${playtype}, so it has been removed.${ad_channel === channels.extreme ? ` Please specify at least one extreme kink to make your ad on topic. See ${channels.extreme_definition} for a list of extreme kinks.` : ""}`;
                    channels.lfp_moderation.send(`${template} (confirmed by @${nickname})`)
                    .then(message => message.edit(`${template} (confirmed by ${user})`));
                    //log in reports log
                    util.sendTextMessage(channels.report_log, new DiscordJS.MessageEmbed().setTimestamp(new Date().getTime())
                    .setDescription(`${reaction} Removed ad by ${message.author} reported by ${reporters} confirmed by ${user} concerning [this report](${messagereaction.message.url}).`));
                    break;
                }
                case "☠": //extreme
                {
                    //delete original message
                    await message.delete({reason: "Founded LFP-ad-report"});
                    //yell at author
                    const author_member = server.members.cache.get(message.author.id);
                    const extreme_role_explanation = author_member?.roles.cache.has(roles.Extreme.id) ? "" : ` You cannot see the channel because you don't have the Extreme role. You can get it in ${channels.roles_selection}.`;
                    const template = `<@${message.author.id}>, your ad does not fit in ${ad_channel} because it contains extreme kinks, so it has been removed. Please only post such ads in ${channels.extreme}.${extreme_role_explanation}`;
                    channels.lfp_moderation.send(`${template} (confirmed by @${nickname})`)
                    .then(message => message.edit(`${template} (confirmed by ${user})`));
                    //log in reports log
                    util.sendTextMessage(channels.report_log, new DiscordJS.MessageEmbed().setTimestamp(new Date().getTime())
                    .setDescription(`${reaction} Removed ad by ${message.author} reported by ${reporters} confirmed by ${user} concerning [this report](${messagereaction.message.url}).`));
                    break;
                }
                case "🤝": //irl request
                {
                    //delete original message
                    await message.delete({reason: "Founded LFP-ad-report"});
                    //yell at author
                    const template = `<@${message.author.id}>, your ad does not fit in ${ad_channel} because it is looking for real-life elements, so it has been removed. Please only post such ads in ${channels.real_life}.`;
                    channels.lfp_moderation.send(`${template} (confirmed by @${nickname})`)
                    .then(message => message.edit(`${template} (confirmed by ${user})`));
                    //log in reports log
                    util.sendTextMessage(channels.report_log, new DiscordJS.MessageEmbed().setTimestamp(new Date().getTime())
                    .setDescription(`${reaction} Removed ad by ${message.author} reported by ${reporters} confirmed by ${user} concerning [this report](${messagereaction.message.url}).`));
                    break;
                }
                case "👶": //underage
                {
                    //delete original message
                    await message.delete({reason: "Founded LFP-ad-report"});
                    //yell at author
                    const template = `<@${message.author.id}>, your ad does not fit in ${ad_channel} because it containes references to or images of underage characters which is not allowed, so the ad has been removed. If you have ageplay as a kink please specify that you are not looking to play with underage characters.`;
                    channels.lfp_moderation.send(`${template} (confirmed by @${nickname})`)
                    .then(message => message.edit(`${template} (confirmed by ${user})`));
                    //log in reports log
                    util.sendTextMessage(channels.report_log, new DiscordJS.MessageEmbed().setTimestamp(new Date().getTime())
                    .setDescription(`${reaction} Removed ad by ${message.author} reported by ${reporters} confirmed by ${user} concerning [this report](${messagereaction.message.url}).`));
                    break;
                }
                case "❔": //unfounded report
                {
                    //yell at reporters
                    if (reporters !== "") { //not a retracted report
                        const template = `${reporters}, the ad you reported in ${ad_channel} (<${message.url}>) seems to be on-topic since it's looking ${playtype}. What is wrong with it?`;
                        channels.lfp_moderation.send(`${template} (marked unfounded by @${nickname})`)
                        .then(message => message.edit(`${template} (marked unfounded by ${user})`));
                    }
                    //remove reactions from ad
                    for (const [, reaction] of message.reactions.cache) {
                        if (reaction.emoji.name === "❌") {
                            await reaction.remove();
                            break;
                        }
                    }
                    //log in reports log
                    util.sendTextMessage(channels.report_log, new DiscordJS.MessageEmbed().setTimestamp(new Date().getTime())
                    .setDescription(`${reaction} Ad by ${message.author} ${reporters ? `reported by ${reporters}` : `with retracted report`} marked unfounded by ${user} concerning [this ad](${message.url})/[this report](${messagereaction.message.url}).`));
                    break;
                }
                case "✋":
                {
                    //log in reports log
                    util.sendTextMessage(channels.report_log, new DiscordJS.MessageEmbed().setTimestamp(new Date().getTime())
                    .setDescription(`${reaction} Ad by ${message.author} ${reporters ? `reported by ${reporters}` : `with retracted report`} handled manually by ${user} concerning [this ad](${message.url})/[this report](${messagereaction.message.url}).`));
                    break;
                }
                case "🧨":
                {
                    //delete original message
                    await message.delete({reason: "Founded LFP-ad-report"});
                    //log in reports log
                    util.sendTextMessage(channels.report_log, new DiscordJS.MessageEmbed().setTimestamp(new Date().getTime())
                    .setDescription(`${reaction} Ad by ${message.author} ${reporters ? `reported by ${reporters}` : `with retracted report`} deleted without message by ${user} concerning [this report](${messagereaction.message.url}).`));
                    break;
                }
                default: //don't react with random emojis reeeeeee
                    return;
            }
        }
        else { //ad has already been deleted
            util.sendTextMessage(channels.report_log, new DiscordJS.MessageEmbed().setTimestamp(new Date().getTime())
            .setDescription(`${reaction} Deleted ad handled by ${user} concerning [this report](${messagereaction.message.url}).`));
            remove_own_reactions(messagereaction.message);
        }
        if (messagereaction.emoji.name === "✋" || messagereaction.emoji.name === "❔") {
            remove_own_reactions(messagereaction.message); //otherwise the deletion of the message will remove the reactions
        }
    }
});

client.on("messageUpdate", async (old_message, new_message) => {
    if (!(new_message instanceof DiscordJS.Message)) {
        new_message = await new_message.fetch();
    }
    if (lfpChannels.reduce((found, lfp_channel) => found || lfp_channel.id === new_message.channel.id, false)) {
        if (channels.reported_rps.messages.cache.size < 10) await channels.reported_rps.messages.fetch({limit: 100});
        const old_report = channels.reported_rps.messages.cache.find((message) => {
            const footer_text = message.embeds[0]?.footer?.text;
            if (!footer_text) return false;
            const [channelID, messageID] = footer_text.split("/");
            return messageID === new_message.id && channelID === new_message.channel.id;
        });
        if (!old_report) return;
        const details = old_report.embeds[0]?.fields[0];
        if (!details) return;
        const reporter_id = details.value.match(/Reported by: <@!?(\d{18})>\n/)?.[1];
        if (!reporter_id) return;
        const reporter = client.users.cache.get(reporter_id);
        if (!reporter) return;
        await old_report.edit(null, get_ad_report(new_message, reporter));
    }
});

client.on("messageDelete", async (deleted_message) => {
    if (lfpChannels.reduce((found, lfp_channel) => found || lfp_channel.id === deleted_message.channel.id, false)) {
        if (channels.reported_rps.messages.cache.size < 10) await channels.reported_rps.messages.fetch({limit: 100});
        const old_report = channels.reported_rps.messages.cache.find((message) => {
            const footer_text = message.embeds[0]?.footer?.text;
            if (!footer_text) return false;
            const [channelID, messageID] = footer_text.split("/");
            return messageID === deleted_message.id && channelID === deleted_message.channel.id;
        });
        if (!old_report) return;
        const details = old_report.embeds[0]?.fields[0];
        if (!details) return;
        const reporter_id = details.value.match(/Reported by: <@!?(\d{18})>\n/)?.[1];
        if (!reporter_id) return;
        const reporter = client.users.cache.get(reporter_id);
        if (!reporter) return;
        if (deleted_message instanceof DiscordJS.Message) {
            await old_report.edit(null, get_ad_report(deleted_message, reporter));
        }
        await remove_own_reactions(old_report);
    }
});

client.on("channelUpdate", (oldChannel, newChannel) => {
    if (!(oldChannel instanceof DiscordJS.GuildChannel) || !(newChannel instanceof DiscordJS.GuildChannel)) {
        return
    }
    if (newChannel.guild.id !== server.id) return; // Ignore non-main servers
    if (oldChannel.parent && newChannel.parent && oldChannel.parent.id !== newChannel.parent.id) {
        util.log(`:warning: Channel ${newChannel} was moved! Category ${oldChannel.parent} position ${oldChannel.position} -> ${newChannel.parent} position ${newChannel.position}`, "Channel Position", util.logLevel.WARN);
    }
    else if (oldChannel.position !== newChannel.position && Math.abs(oldChannel.position - newChannel.position) != 1) {
        util.log(`:warning: Channel ${newChannel} was moved! Position ${oldChannel.position} -> ${newChannel.position}`, "Channel Position", util.logLevel.WARN);
    }
});

client.on("message", (message) => {
    if (client === null || client.user === null) {
        return;
    }
    if (message.channel.type !== "text") return; // Ignore DMs
    if (message.author.username === client.user.username) return;
    if (message.author.bot) {
        //copy bad word messages from log to bad words log
        if (message.channel.id === channels.reports_log.id) {
            for (const embed of message.embeds) {
                for (const field of embed.fields) {
                    if (field.name === "Reason" && field.value === "Banned words") {
                        channels.bad_words_log.send(new DiscordJS.MessageEmbed(embed))
                        .catch(console.error);
                    }
                }
            }
        }
        if (
            (message.author.id !== "159985870458322944" || message.channel.name !== "📈level-up-log") &&
            (message.author.id !== "155149108183695360" || message.channel.name !== "🚨reports-log") &&
            (message.author.username !== "Carl-bot Logging" || message.channel.name !== "🎫authentication-logs")
        ) {
            return;
        }
    }
    if (!message.channel.guild) return; // Ignore DMs
    if (message.channel.guild.id !== server.id) return; // Ignore non-main servers
    if (lockdown) return;

    // Prefix as first character -> command
    if (message.content.indexOf(prefix) === 0) {
        cmd.call(message);
    }

    //delete previous promotion
    if (message.channel === channels.promotion) {
        //Delete previous message
        (async () => {
            const messages = await message.channel.messages.fetch({ "before": message.id, "limit": 100 });
            for (const [message_id, old_message] of messages) {
                if (old_message.author.id === message.author.id && old_message.id !== message.id) await old_message.delete({reason: "Repeat post in promotion"});
            }
        })();
    }

    //LFP rule enforcement
    if (lfpChannels.includes(message.channel)) {
        const ad_limit = 4;
        //Check for 3+ images
        (async () => {
            if (util.image_link_count(message) > 3) {
                message.delete({reason: "More than 3 images in an RP ad"});
                util.sendTextMessage(channels.lfp_moderation,
                `${message.author}, your roleplaying ad in ${message.channel} has been removed because it had more than 3 images.\n` +
                `Please follow the rules as described in ${channels.lfp_info}.`);
                util.sendTextMessage(channels.report_log, new DiscordJS.MessageEmbed()
                .setDescription(`✅ Deleted RP ad by ${message.author} in ${message.channel} because it contained more than 3 images.`)
                .setTimestamp(new Date().getTime()));
                return;
            }
            //Add DM status emotes
            const user = server.members.cache.get(message.author.id);
            const add_reaction = async (emote: string) => {
                try {
                    await util.react(message, emote);
                } catch (error) {
                    console.log(`Failed adding emote ${emote} because ${error}`);
                }
            }
            if (user) {
                await add_reaction("🇩");
                await add_reaction("🇲");
                if (user.roles.cache.has(roles.DMs_open.id)) await add_reaction("✅");
                else if (user.roles.cache.has(roles.DMs_closed.id)) await add_reaction("⛔");
                else if (user.roles.cache.has(roles.Ask_to_dm.id)) await add_reaction("⚠️");
                else await add_reaction("❔");
            }
        })();

        //Delete previous messages
        (async () => {
            //delete old ad
            const messages = message.channel.messages.cache;
            for (const [, old_message] of messages) {
                if (old_message.author.id === message.author.id && old_message.id !== message.id) {
                    await old_message.delete({reason: "New ad posted in LFP channel"});
                }
            }
            //Delete ad spam
            let old_messages : DiscordJS.Message[] = [];
            for (const lfpchannel of lfpChannels) {
                const channel_messages = lfpchannel.messages.cache;
                for (const [, old_message] of channel_messages) {
                    if (old_message.author.id === message.author.id) {
                        old_messages.push(old_message);
                    }
                }
            }
            if (old_messages.length > ad_limit) {
                const sorted_messages = old_messages.sort((m1, m2) => m2.createdTimestamp - m1.createdTimestamp);
                for (const old_message of sorted_messages.splice(ad_limit)) {
                    if (old_message.createdTimestamp > new Date().getTime() - 10 * 60 * 1000) {
                        await channels.lfp_moderation.send(`${old_message.author} Please note that you can only post 4 ads in total across all the LFP channels. If you post a 5th, the oldest gets automatically deleted, which applied to your ad in ${old_message.channel}.`);
                    }
                    util.log(`Deleted ad by ${old_message.author} in ${old_message.channel} because of breaking ${ad_limit} ad limit`, `Ad moderation`, util.logLevel.INFO);
                    await old_message.delete({reason: "Ad spam"});
                }
            }
        })();
    }

    // delete links in general
    if ([channels.general.id, channels.ooc_general.id, channels.rp_general.id].includes(message.channel.id)) {
        if (message.content.match(link_regex)) {
            if (util.isStaff(message)) { //have mercy on staff and don't delete messages
            util.react(message, emojis.bancat);
                return;
            }
            const logBody = `link in ${message.channel} from ${message.author}\nMessage content: ${message}`;
            message.delete()
                .then(() => {
                    util.log(`Removed ${logBody}`, 'Automatic Link Removal', util.logLevel.WARN);
                })
                .catch((e) => {
                    util.log(`Failed to remove ${logBody}\nError: ${e.toString()}`, 'Automatic Link Removal', util.logLevel.ERROR);
                });
            util.sendTextMessage(message.channel, `${message.author} Sorry, no media or links of any kind in this channel. Put it in ${channels.nsfw_media} or another media channel please.`);
            return;
        }
    }

    // delete non-media in Hentai Corner and Pornhub categories and nsfw-media
    if (["SOURCE", "NSFW-DISCUSSION", "EXTREME-FETISHES-BOT", "NSFW-BOT-IMAGES"].indexOf(message.channel.name.toUpperCase()) === -1 &&
        message.channel.parent &&
        ["HENTAI CORNER", "PORNHUB"].indexOf(message.channel.parent.name.toUpperCase()) !== -1 ||
        message.channel.id === channels.nsfw_media.id
    ) {
        if (util.isUserStaff(message.author)) return;
        if (!message.content.match(link_regex) && message.attachments.size < 1) {
            const logBody = `Non-Media/-Link in ${message.channel} from ${message.author}\nMessage content: ${message}`;
            message.delete()
                .then(() => {
                    util.log(`Removed ${logBody}`, 'Media Channel Text Filtering', util.logLevel.WARN);
                })
                .catch((e) => {
                    util.log(`Failed to remove ${logBody}\nError: ${e.toString()}`, 'Media Channel Text Filtering', util.logLevel.ERROR);
                });
            message.reply(message.channel.id === channels.nsfw_media.id ?
            `sorry, no messages without media allowed in this channel. Use ${channels.nsfw_media_discussion}.` :
            `sorry, messages without media or links are removed in media channels. Please put it in ${channels.nsfw_discussion} instead.`)
                .then(msg => {
                    setTimeout(()=> {
                        msg.delete();
                    }, 7000);
                });
            return;
        }
    }

    //copy new account joins from auth log to paranoia plaza
    if (message.channel.id === channels.authentication_logs.id) {
        if (!message.embeds) { //Stop chatting in the auth log channel :reeeee:
            return;
        }
        message.embeds.forEach(embed => {
            if ((embed.description?.indexOf("**NEW ACCOUNT**") || 0) > 0) {
                channels.paranoia_plaza.send(new DiscordJS.MessageEmbed(embed))
                .catch(console.error);
            }
        });
        return;
    }

    // If not from Mee6 and contains mentions
    if (message.mentions.members?.size && !message.author.bot && message.channel.id !== channels.contact.id && message.channel.id !== "737043345913675786") {
        // react with :pingangry: to users who mention someone with the Don't Ping role
        const dontPingRole = roles.No_Ping;
        const no_ping_mentions = message.mentions.members.filter(member => (member.roles.cache.has(dontPingRole.id) && member.user.id !== message.author.id));
        if (no_ping_mentions.size !== 0) {
            const no_ping_mentions_string = no_ping_mentions.reduce((prev_member, next_member) => prev_member + `${next_member} `, "");
            const log_message = `${message.author} pinged people with <@&${dontPingRole.id}>:\n${no_ping_mentions_string}\n[Message Link](${message.url})`;
            if (!util.isUserStaff(message.author)) { // exclude staff
                util.log(log_message, "Ping role violation", util.logLevel.INFO);
                util.react(message, ping_violation_reaction_emoji);
            }
        }
    }

    if (message.channel.name === "📈level-up-log") {
        util.handle_level_up(message);
    }

    if (message.mentions.members?.has(client.user.id)) {
        const args = message.content.trim().split(/ +/g).splice(1);
        util.sendTextMessage(channels.accalia_logs,
            new DiscordJS.MessageEmbed()
            .setDescription(message.content)
            .addField("Details", `Mentioned by: ${message.author}\n[Link](${message.url})`));

        if (disableMentions && !util.isStaff(message)) return;

        if (args.length === 0) {
            util.sendTextMessage(message.channel, `Awoo!`);
        } else {
            switch (args[0]) {
                case "prefix": {
                    util.sendTextMessage(message.channel, `${message.author}, the prefix is ${prefix} ... don't tell me you already forgot... qwq`);
                    break;
                }
                case "help": {
                    cmd["help"](message);
                    break;
                }
            }
        }
    }
    if (message.channel.name === "🚨reports-log") {
        const was_mute = message.embeds[0].author?.name?.indexOf('Mute');
        if (was_mute) {
            const usr = message.embeds[0].fields[0].value;
            const usrid = usr.match(/([0-9])+/g)?.[0];
            if (!usrid) {
                return;
            }
            const userM = message.guild?.members.cache.get(usrid);
            if (userM && userM.roles.cache.has(roles.Newcomer.id)) {
                util.log(`Attempting to ban Muted Newcomer: ${message.embeds[0].fields[0].value}`, 'Mute check', util.logLevel.INFO);
                let options = {
                    reason: "Violating Automoderator chat rules as a Newcomer",
                    days: 7
                };
                userM.ban(options)
                    .then(() => {
                        util.log(`${userM} banned for: ${options.reason}`, 'Mute check', util.logLevel.INFO);
                        util.sendTextMessage(channels.warnings,
                            `${userM} banned for: ${options.reason}\n`
                        );
                    })
                    .catch(() => util.log(`${userM} failed to kick.`, 'Mute check', util.logLevel.WARN));
            }
        }
    }


    // Post the LFP rules in LFP channels
    if (lfpChannels.indexOf(message.channel) !== -1) {
        const channel = message.channel;
        if (lfpTimer[channel.name]) {
            clearTimeout(lfpTimer[channel.name]);
        }
        lfpTimer[channel.name] = setTimeout(() => {
            channel.messages.fetch()
            .then(messages => {
                let msg = messages.filter(m => m.author.id === client.user?.id);
                if (msg.size !== 1) {
                    util.log(`Deleting ${msg.size} of my messages in ${channel} which shouldn't happen.`, "lfpInfo", util.logLevel.WARN);
                }
                msg.forEach(m => m.delete());
            });

            let title = "";
            let target = "";

            switch (channel.name.substr(2)) {
                //RP Looking For
                case "with-male":
                    title = "MALE Characters";
                    target = "Males, people with the \"Male\" role (not femboys or traps)";
                    break;
                case "with-female":
                    title = "FEMALE Characters";
                    target = "Females, Tomboys, etc.";
                    break;
                case "with-femboy":
                    title = "FEMBOY Characters";
                    target = "People with the \"Trap/Femboy\" role";
                    break;
                case "with-furry":
                    title = "FURRY Characters";
                    target = "Furries and scalies, not beasts, ferals or robots";
                    break;
                case "with-beast":
                    title = "BEAST Characters";
                    target = "People playing Beasts who are interested in Bestiality RP (not anthros)";
                    break;
                case "with-futa":
                    title = "FUTANARI / HERMAPHRODITE Characters";
                    target = "Futanari and Hermaphrodites";
                    break;
                case "with-humanoid":
                    title = "Humanoid Characters";
                    target = "Humanoids such as demons, orcs, vampires and similar";
                    break;

                //RP Playing As
                case "as-male":
                    title = "MALE Characters";
                    target = "Males and people with the \"Male\" role (not femboys or traps)";
                    break;
                case "as-female":
                    title = "FEMALE Characters";
                    target = "Females, Tomboys, etc.";
                    break;
                case "as-femboy":
                    title = "FEMBOY Characters";
                    target = "People with the \"Trap/Femboy\" role";
                    break;
                case "as-furry":
                    title = "Furry Characters";
                    target = "Furries and scalies, not beasts, ferals or robots";
                    break;
                case "as-beast":
                    title = "BEAST Characters";
                    target = "Beasts and people interested in Bestiality RP (not anthros)";
                    break;
                case "as-futa":
                    title = "FUTANARI / HERMAPHRODITE Characters";
                    target = "Futanari and Hermaphrodites";
                    break;
                case "as-humanoid":
                    title = "Humanoid Characters";
                    target = "Humanoids such as demons, orcs, vampires and similar";
                    break;

                //RP By Type
                case "ll-style":
                    title = "ALL-STYLE RP";
                    target = "RPs that don't fit elsewhere or you don't want to worry about finding the correct channel.";
                    break;
                case "vanilla":
                    title = "VANILLA RPs";
                    target = "People who like a more wholesome RP that does not involve hardcore themes.";
                    break;
                case "gay":
                    title = "GAY RPs";
                    target = "People looking for RPs involving sexual relationships between males.";
                    break;
                case "lesbian":
                    title = "LESBIAN RPs";
                    target = "People looking for RPs involving sexual relationships between females.";
                    break;
                case "xtreme":
                    title = "EXTREME RPs";
                    target = "People looking for an RP with more hardcore kinks like vore, gore and scat.";
                    break;
                case "group":
                    title = "GROUP RPs";
                    target = "Players who are looking for a roleplay group as opposed to a 1 on 1 RP.";
                    break;
                case "long-term-plot":
                    title = "LONG-TERM RPs";
                    target = "People who are interested in plots that aim to evolve over weeks and are not meant to end within a couple of days.";
                    break;
                case "gm-style":
                    title = "GM-STYLE RPs";
                    target = "Game Masters that create a world and plots as well as players who want to play in those.";
                    break;
                case "real-life":
                    title = "REAL LIFE Contacts";
                    target = "People who want some form of real life contact, be it dating, sharing images, talking in voice chat or similar.";
                    break;
                case "breeding":
                    title = "BREEDING";
                    target = "People wanting an RP focused on sex for the purpose of procreation as opposed to joy.";
                    break;

                default:
                    util.log(`Failed finding matchmaking channel ${channel.name.substr(2)}`, "Matchmaking", util.logLevel.ERROR);
                }

            const playing_as = channel.parent?.id === categories.playing_as.id;
            const playing_with = channel.parent?.id === categories.playing_with.id;
            const by_type = channel.parent?.id === categories.by_type.id;
            const rp_type_str =
            playing_as ? "Playing As" :
            playing_with ? "Playing With" :
            by_type ? "RP Type" :
            "";
            const rp_with_as_looking_for =
            playing_as ? "want to play as" :
            playing_with ? "want to play with" :
            by_type ? "are looking for" :
            "";
            const exclusive = [channels.extreme.id, channels.real_life.id].indexOf(message.channel.id) !== -1 ? "⚠️ __**If your ad is on-topic in this channel do not post it in other channels!**__\n\n" : "";
            if (!(message.channel instanceof DiscordJS.TextChannel)) return;
            const lfpMsg =
                `>>> __**${rp_type_str} ${title} Channel Info**__\n` +
                `🔹 __What posts are to be expected and to be posted in this channel?__\n` +
                `LFP ads which explicitly state that they **${rp_with_as_looking_for} ${title}**.\n\n` +
                `🔹 __Target Audience for LFP posts in this channel:__\n` +
                `**${playing_as ? "Anyone wanting to play with " : ""}${target}**\n\n` +
                `${exclusive}` +
                `If you see posts which are __not clearly looking for these kinds of RP__ in this channel let the staff know by reacting with :x: (\`:x:\`) or reporting it in ${channels.reports}!\n\n` +
                `If you want to **contact** someone, **please check their DM Roles** first! If they have **Ask to DM ⚠️** (🇩 🇲 ⚠️) or **DMs Closed ⛔** (🇩 🇲 ⛔) use ${channels.contact}!\n\n` +
                `*More info in:* ${channels.lfp_info}\n\n`
            ;
            const lfpAllstyleMsg =
                `>>> __**${rp_type_str} ${title} Channel Info**__\n` +
                `🔹 __What posts are to be expected and to be posted in this channel?__\n` +
                `Any LFP ad that that doesn't contain disallowed content such as underage characters.\n\n` +
                `🔹 __Target Audience for LFP posts in this channel:__\n` +
                `**Anyone looking to browse diverse ads**\n\n` +
                `If you see posts which are looking to play with or as underage characters let the staff know by reacting with :x: (\`:x:\`) or reporting it in ${channels.reports}!\n\n` +
                `If you want to **contact** someone, **please check their DM Roles** first! If they have **Ask to DM ⚠️** (🇩 🇲 ⚠️) or **DMs Closed ⛔** (🇩 🇲 ⛔) use ${channels.contact}!\n\n` +
                `*More info in:* ${channels.lfp_info}\n\n`
            ;

            channel.send(channel.id === channels.all_style.id ? lfpAllstyleMsg : lfpMsg)
            .catch(error => util.log(`Failed updating lfp info in ${channel} because ${error}`, "lfpInfo", util.logLevel.ERROR));
        }, 2000);
    }
});

client.on("guildMemberUpdate", (old_member, new_member) => {
    if (new_member.guild?.id !== server.id) { //ignore non-main servers
        return;
    }
    member_check(new_member);
});

const permissions_map = new Map([
    ["ADMINISTRATOR", DiscordJS.Permissions.FLAGS.ADMINISTRATOR],
    ["CREATE_INSTANT_INVITE", DiscordJS.Permissions.FLAGS.CREATE_INSTANT_INVITE],
    ["KICK_MEMBERS", DiscordJS.Permissions.FLAGS.KICK_MEMBERS],
    ["BAN_MEMBERS", DiscordJS.Permissions.FLAGS.BAN_MEMBERS],
    ["MANAGE_CHANNELS", DiscordJS.Permissions.FLAGS.MANAGE_CHANNELS],
    ["MANAGE_GUILD", DiscordJS.Permissions.FLAGS.MANAGE_GUILD],
    ["ADD_REACTIONS", DiscordJS.Permissions.FLAGS.ADD_REACTIONS],
    ["VIEW_AUDIT_LOG", DiscordJS.Permissions.FLAGS.VIEW_AUDIT_LOG],
    ["PRIORITY_SPEAKER", DiscordJS.Permissions.FLAGS.PRIORITY_SPEAKER],
    ["STREAM", DiscordJS.Permissions.FLAGS.STREAM],
    ["VIEW_CHANNEL", DiscordJS.Permissions.FLAGS.VIEW_CHANNEL],
    ["SEND_MESSAGES", DiscordJS.Permissions.FLAGS.SEND_MESSAGES],
    ["SEND_TTS_MESSAGES", DiscordJS.Permissions.FLAGS.SEND_TTS_MESSAGES],
    ["MANAGE_MESSAGES", DiscordJS.Permissions.FLAGS.MANAGE_MESSAGES],
    ["EMBED_LINKS", DiscordJS.Permissions.FLAGS.EMBED_LINKS],
    ["ATTACH_FILES", DiscordJS.Permissions.FLAGS.ATTACH_FILES],
    ["READ_MESSAGE_HISTORY", DiscordJS.Permissions.FLAGS.READ_MESSAGE_HISTORY],
    ["MENTION_EVERYONE", DiscordJS.Permissions.FLAGS.MENTION_EVERYONE],
    ["USE_EXTERNAL_EMOJIS", DiscordJS.Permissions.FLAGS.USE_EXTERNAL_EMOJIS],
    ["VIEW_GUILD_INSIGHTS", DiscordJS.Permissions.FLAGS.VIEW_GUILD_INSIGHTS],
    ["CONNECT", DiscordJS.Permissions.FLAGS.CONNECT],
    ["SPEAK", DiscordJS.Permissions.FLAGS.SPEAK],
    ["MUTE_MEMBERS", DiscordJS.Permissions.FLAGS.MUTE_MEMBERS],
    ["DEAFEN_MEMBERS", DiscordJS.Permissions.FLAGS.DEAFEN_MEMBERS],
    ["MOVE_MEMBERS", DiscordJS.Permissions.FLAGS.MOVE_MEMBERS],
    ["USE_VAD", DiscordJS.Permissions.FLAGS.USE_VAD],
    ["CHANGE_NICKNAME", DiscordJS.Permissions.FLAGS.CHANGE_NICKNAME],
    ["MANAGE_NICKNAMES", DiscordJS.Permissions.FLAGS.MANAGE_NICKNAMES],
    ["MANAGE_ROLES", DiscordJS.Permissions.FLAGS.MANAGE_ROLES],
    ["MANAGE_WEBHOOKS", DiscordJS.Permissions.FLAGS.MANAGE_WEBHOOKS],
    ["MANAGE_EMOJIS", DiscordJS.Permissions.FLAGS.MANAGE_EMOJIS],
]);

const permission_to_string = (permission: number) => {
    let perm_string = "";
    for (const [name, perm] of permissions_map) {
        if ((perm & permission) !== 0) {
            perm_string += name + ", ";
        }
    };
    return perm_string.slice(0, -2);
}

const get_permission_diff_string = (old_permissions: number, new_permissions: number) => {
    let added = "";
    let removed = "";
    for (const [name, permission] of permissions_map) {
        if ((old_permissions & permission) !== 0 && (new_permissions & permission) === 0) {
            removed += name + ", ";
        }
        if ((old_permissions & permission) === 0 && (new_permissions & permission) !== 0) {
            added += name + ", ";
        }
    }
    let result = "";
    if (added.length) {
        result += "Added Permission(s): *" + added.slice(0, -2) + "* ";
    }
    if (removed.length) {
        result += "Removed Permission(s): *" + removed.slice(0, -2) + "* ";
    }
    return result;
};

const id_to_string = (id: DiscordJS.Snowflake): string => {
    //Figure out the origin of the ID
    if (client.users.cache.get(id)) { //a user?
        return `<@${id}>`;
    }
    else if (server.roles.cache.get(id)) { //a role?
        if (id === server.roles.everyone?.id) {
            return `@everyone`;
        }
        return `<@&${id}>`;
    }
    else if (server.channels.cache.get(id)) { //a channel?
        return `<#${id}>`;
    }
    else if (server.emojis.cache.get(id)) { //an emoji?
        return `${server.emojis.cache.get(id)}`;
    }
    else { //ok I give up
        return id;
    }
}

const to_string = (thing: any): string => {
    if (thing instanceof Array) {
        let result = "[";
        for (const key in thing) {
            result += to_string(thing[key]) + ", ";
        }
        result = result.slice(0, -2);
        result += "]";
        return result;
    }
    else if (thing instanceof Object) {
        if ("id" in thing) {
            return id_to_string(thing.id);
        }
        let result = "{";
        Object.entries<any>(thing).forEach(([key, value]) => {
            if (key === "id") {
                result += `${id_to_string(<DiscordJS.Snowflake>value)}`;
            }
            else if (key === "name") {
                result += `${value}`;
            }
            else if (key === "color") {
                result += `color: #${value.toString(16)}`;
            }
            else {
                result += `${key}: ${to_string(value)}`;
            }
            result += ", "
        });
        result = result.slice(0, -2);
        result += "}";
        return result;
    }
    else if (typeof thing === "string") {
        return `"${thing}"`;
    }
    else if (typeof thing === "number") {
        return `${thing}`;
    }
    else if (typeof thing === "boolean") {
        return thing ? "true" : "false";
    }
    else {
        return `**Error: Unhandled object type ${typeof thing}**`;
    }
}

const audit_changes_to_string = (changes: DiscordJS.AuditLogChange[] | null) => {
    if (changes === null) {
        return "";
    }
    return changes.reduce((current, change) => {
        let curr = ", ";
        let change_key = change.key ? `${change.key}: ` : "";
        if (change.key === "$add") {
            change_key = "added ";
        }
        if (change.key === "$remove") {
            change_key = "removed ";
        }
        if (change.key === "permissions" || change.key === "deny" || change.key === "allow") {
            curr += `${change_key}${get_permission_diff_string(change.old, change.new)}`;
        }
        else if (change.key === "color") {
            curr += `${change_key}#${change.old.toString(16)}➔#${change.new.toString(16)}`;
        }
        else if (change.key === "rate_limit_per_user") {
            curr += `slowmode: ${change.old}s➔${change.new}s`;
        }
        else {
            curr += change_key;
            curr += change.old !== undefined ? to_string(change.old) : "";
            curr += (change.old !== undefined && change.new !== undefined) ? "➔" : "";
            curr += change.new !== undefined ? to_string(change.new) : "";
        }
        return curr + current;
    }, "").slice(2);
};

const audits_to_string = (audits: DiscordJS.GuildAuditLogs, snowflake: DiscordJS.Snowflake): string => {
    return audits.entries.reduce((current, audit) => {
        if (audit.target instanceof DiscordJS.Invite) { //can't audit invites because invites don't have an ID
            return current;
        }
        if (audit.target?.id !== snowflake) { //not an entry where something was done to the target
            return current;
        }
        let curr = `**${util.time(new Date().getTime() - audit.createdAt.getTime())} ago:** `;
        if (audit.action === "MEMBER_ROLE_UPDATE") {
            curr += `${audit.executor} ${audit_changes_to_string(audit.changes)}`;
        }
        else if (audit.action === "MEMBER_UPDATE") {
            curr += `${audit.executor} changed nickname: ${audit_changes_to_string(audit.changes)}`;
        }
        else if (audit.action === "MEMBER_KICK") {
            curr += `Was kicked by ${audit.executor}`;
        }
        else if (audit.action === "CHANNEL_CREATE") {
            curr += `Was created by ${audit.executor}`;
        }
        else if (audit.action === "CHANNEL_OVERWRITE_UPDATE") {
            curr += `Permissions updated by ${audit.executor}: ${audit_changes_to_string(audit.changes)}`;
        }
        else if (audit.action === "CHANNEL_UPDATE") {
            curr += `${audit.executor} updated ${audit_changes_to_string(audit.changes)}`;
        }
        else if (audit.action === "ROLE_UPDATE") {
            curr += `${audit.executor} ${audit_changes_to_string(audit.changes)}`;
        }
        else if (audit.action === "EMOJI_CREATE") {
            curr += `${audit.executor} created emoji. ${audit_changes_to_string(audit.changes)}`;
        }
        else if (audit.action === "GUILD_UPDATE") {
            curr += `${audit.executor} updated server ${audit_changes_to_string(audit.changes)}`;
        }
        else if (audit.action === "MEMBER_BAN_ADD") {
            curr += `Banned by ${audit.executor}`;
        }
        else if (audit.action === "MEMBER_BAN_REMOVE") {
            curr += `Unbanned by ${audit.executor}`;
        }
        else {
            curr += `${audit.executor} ${audit.action}`;
            if (audit.changes) {
                curr += ` changes: `;
                curr += audit_changes_to_string(audit.changes);
            }
            else {
                curr += " ";
            }
        }
        if (audit.extra) {
            curr += " extras: " + to_string(audit.extra);
        }
        if (audit.reason) {
            curr += ` because ${audit.reason}`;
        }
        return curr + "\n" + current;
    }, "");
};

const audit_send_result = async (target_string: string, string: string, channel: DiscordJS.TextChannel | DiscordJS.DMChannel | DiscordJS.NewsChannel) => {
    const result_string = `**Audit for ${target_string}**:\n` + string;
    let message_pieces = DiscordJS.Util.splitMessage(result_string);
    if (!Array.isArray(message_pieces)) {
        message_pieces = [message_pieces];
    }
    for (const message_piece of message_pieces) {
        try {
            await channel.send(new DiscordJS.MessageEmbed().setDescription(message_piece));
        }
        catch (error) {
            console.log(`Failed sending audit log piece because of error ${error}:\n${message_piece}`);
            util.log(`Failed sending audit log piece because ${error}`, "Audit command", util.logLevel.ERROR);
        }
    }
};

const audit_log_search = async (target_string: string, message: DiscordJS.Message, snowflake: DiscordJS.Snowflake, result_string = "", latest_entry?: string, counter = 0) => {
    const counter_limit = 50; //How many sets of 100 audit logs will be requested from Discord. Increasing the number usually gives more results and also makes it slower.
    const character_limit = 10000; //How long the result message must be before we consider it enough to avoid the command to be too spammy. The limit can be raised past 2000 in which case multiple messages will be posted.
    if (counter === 0) {
        message.channel.startTyping();
    }
    try {
        const audits = await server.fetchAuditLogs(latest_entry ? {limit: 100, before: latest_entry} : {limit: 100});
        result_string = audits_to_string(audits, snowflake) + result_string;

        if (result_string.length > character_limit || audits.entries.size < 100 || counter > counter_limit) {
            await audit_send_result(target_string, result_string, message.channel);
            message.channel.stopTyping();
        }
        else {
            await audit_log_search(target_string, message, snowflake, result_string, audits.entries.lastKey(), counter + 1);
        }
    }
    catch (error) {
        await audit_send_result(target_string, result_string + `\nFailed fetching more audits because ${error}`, message.channel);
        message.channel.stopTyping();
    }
};

const dead_char_search = async (start_message_id: string, message: DiscordJS.Message, archive_channel: DiscordJS.TextChannel) => {
    const messages = await archive_channel.messages.fetch({limit: 100, before: start_message_id});
    if (messages.size === 0) { //reached the end of messages
        util.sendTextMessage(message.channel, "Didn't find any messages with mentions of users that are not in the server.");
        return;
    }
    const first_message = messages.first();
    if (!first_message) return; //should never happen because we have at least 1 message at this point
    const oldest_message = messages.reduce((l, r) => l.createdTimestamp < r.createdTimestamp ? l : r, first_message);
    const messages_with_dead_mentions = messages.filter((message) =>
        !!message.mentions.users.find(user => !server.members.cache.has(user.id))
    );
    if (messages_with_dead_mentions.size === 0) {
        //didn't find any, keep searching
        dead_char_search(oldest_message.id, message, archive_channel);
        return;
    }
    //actually found results
    let counter = 1;
    const leavers_messages = messages_with_dead_mentions.reduce((current, message) => {
        const leavers = message.mentions.users.filter(user => server.members.cache.get(user.id) === undefined);
        if (leavers.size === 0) {
            return current;
        }
        return `${current}[${counter++}. archive](${message.url}) ${leavers.reduce((current, leaver) => current + `${leaver}`, "")}\n`;
    }, "");
    util.sendTextMessage(message.channel, new DiscordJS.MessageEmbed().setDescription(leavers_messages + "For new results use command\n**_chararchive " + oldest_message.id + "**"));
}

type Cmd = {
    [key: string]: (arg1: DiscordJS.Message, arg2?: string[]) => void
};
const cmd: Cmd = {
    ping: async function (message) {
        try {
            const m = await message.channel.send("Ping!");
            m.edit(`Pong! Latency is ${m.createdTimestamp - message.createdTimestamp}ms. API Latency is ${Math.round(client.ws.ping)}ms`);
            util.log('used command: ping', "ping", util.logLevel.INFO);
        } catch (e) {
            util.log('Failed to process command (ping)', 'ping', util.logLevel.ERROR);
        }
    },
    staff: async function (message) {
        try {
            const m = await message.channel.send("Checking!");
            let isStaff = util.isStaff(message);
            m.edit(`${message.author} is${(!isStaff) ? ' not' : '' } a staff member!`);
            util.log('used command: staff', "staff", util.logLevel.INFO);
        } catch (e) {
            util.log('Failed to process command (staff)', 'staff', util.logLevel.ERROR);
        }
    },
    warn: async function (message, args) {
        if (message.channel.id === "737043345913675786") return;
        try {
            if (!util.isStaff(message)) {
                //util.sendTextMessage(message.channel, `${message.author} Shoo! You don't have the permissions for that!`);
                return;
            }
            if (!args) {
                console.error("Somehow we got a warn call without args.");
                return;
            }
            let member = message.mentions.members?.first() || message.guild?.members.cache.get(args[0]);
            if (!member)
                return util.sendTextMessage(message.channel, `Please mention a valid member of this server! REEEEEEE`);
            if (member.roles.cache.has(roles.STAFF.id))
                return util.sendTextMessage(message.channel, `I cannot warn ${member.user.username}... :thinking:`);

                
            const hasWarn1 = member.roles.cache.has(roles.WARN_1.id);
            const hasWarn2 = member.roles.cache.has(roles.WARN_2.id);
            let level = 0;
            let reason = message.content.substring(message.content.indexOf(args[0]) + args[0].length + 1);
            let err = false;

            // Warn functionality
            if (hasWarn2) {
                level = 3;
            } else if (hasWarn1) {
                await member.roles.add(roles.WARN_2)
                    .then(() => {
                        if (!member) {
                            console.log("Error in warnings: Member not found!");
                            return;
                        }
                        member.roles.remove(roles.WARN_1)
                            .catch(() => {
                                util.log(`Failed to remove Warning level 1 from ${member}.`, 'Warn: remove level 1', util.logLevel.ERROR);
                                err = true;
                            });
                        level = 2;
                    })
                    .catch(() => {
                        err = true;
                        util.log(`Failed to add Warning level 2 to ${member}.`, 'Warn: 1->2', util.logLevel.ERROR);
                    });
            } else {
                await member.roles.add(roles.WARN_1)
                    .then(() => {
                        if (!member) {
                            console.log("Error in warnings: Member not found!");
                            return;
                        }
                        member.roles.remove(roles.INNOCENT)
                            .catch(() => {
                                util.log(`Failed to remove Innocent role from ${member}.`, 'Warn: remove Innocent role', util.logLevel.ERROR);
                                err = true;
                            });
                        level = 1;
                    })
                    .catch(() => {
                        err = true;
                        util.log(`Failed to add Warning level 1 to ${member}.`, 'Warn: 0->1', util.logLevel.ERROR);
                    });
            }

            if (err) return;

            const author = server.members.cache.get(message.author.id);
            if (!author) {
                console.log(message.channel, `Error: ${message.author} tried to warn ${member} but is not in the server ... what?`);
                return;
            }
            dbMod.warnUser(member.user, level, author, reason);
            message.delete();
        } catch (e) {
            util.log('Failed to process command (warn)', 'warn', util.logLevel.ERROR);
        }
    },
    stopmention: function (message) {
        if (util.isStaff(message)) {
            disableMentions = true;
            util.sendTextMessage(message.channel, 'No longer listening to non-staff mentions... :(');
            util.log('Disabling responses to non-staff mentions ...', 'disable mentions', util.logLevel.INFO);
        }
    },
    startmention: function (message) {
        if (util.isStaff(message)) {
            disableMentions = false;
            util.sendTextMessage(message.channel, 'Start listening to non-staff mentions... :3');
            util.log('Enabling responses to non-staff mentions', 'enable mentions', util.logLevel.INFO);
        }
    },
    cn: async function (message) {
        if (!message || !util.isStaff(message)) {
            return;
        }
        const newcomerMembers = server.members.cache.filter(member => !member.user.bot && (member.roles.cache.has(roles.Newcomer.id) || !member.roles.cache.has(roles.NSFW.id)));
        console.log(`Found ${newcomerMembers.size} newcomers`);
        let index = 0;
        let report = "";
        for (const [, member] of newcomerMembers) {
            index++;
            console.log(`Checking member ${index}/${newcomerMembers.size} ${member.displayName}`);
            try {
                if ((new Date().getTime() - (server.member(member)?.joinedAt?.getTime() || 0))/1000/60 <= 90) { // joined less than 90 minutes ago
                    report += `${index}/${newcomerMembers.size} Skipped ${member} because they only recently joined\n`;
                    continue;
                }
                if (!member.roles.cache.has(roles.NSFW.id)) {
                    if (await trywait(member.kick(`Not having NSFW role for 90+ minutes`), 3000)) {
                        report += `${index}/${newcomerMembers.size} Kicked ${member} for not clicking the ✅\n`;
                    }
                    else {
                        report += `${index}/${newcomerMembers.size} Timeout trying to kick ${member}\n`;
                    }
                }
                else {
                    if (await trywait(member.roles.remove(roles.Newcomer), 3000)) {
                        report += `${index}/${newcomerMembers.size} Removed newcomer role from ${member}\n`;
                    }
                    else {
                        report += `${index}/${newcomerMembers.size} timeout removing newcomer role from ${member}\n`;
                    }
                }
            }
            catch (e) {
                report += `⚠️ ${index}/${newcomerMembers.size} Error handling ${member}: ${e}\n`;
            }
        }
        console.log(`Done with report`);
        util.log(report.length ? report : `No newcomers found`, 'clearNewcomer', util.logLevel.INFO);
    },
    ancient: async function(message) {
        if (util.isStaff(message)) {
            const now = new Date().getTime();
            let ancientMembers = server.members.cache.filter(m => {
                if (!m.joinedTimestamp) return false;
                return m.joinedTimestamp + 365*24*60*60*1000 <= now && !m.user.bot && !m.roles.cache.has(roles.ANCIENT.id);
            });
            for (const [, ancient_member] of ancientMembers) {
                await ancient_member.roles.add(roles.ANCIENT);
            }
        } else {
            util.sendTextMessage(message.channel, "🤨");
        }
    },
    clear: function(message, args) {
        if (util.isStaff(message)) {
            if (!args?.[0]) {
                return;
            }
            const number = parseInt(args[0]);
            if (args?.[0]) {
                message.channel.messages.fetch({ limit: (number + 1) })
                    .then(messages => {
                        let count = 0;
                        messages.forEach(m => {
                            m.delete();
                            if (++count === messages.size-1) {
                                setTimeout(() => {
                                    message.channel.send(`\`Cleared ${count-1} message(s)!\``)
                                        .then(d => setTimeout(() => d.delete(), 5000));
                                    util.log(`${message.author} cleared ${count-1} meessages in ${message.channel}`, 'clear', util.logLevel.INFO);
                                }, 1000);
                            }
                        });
                    });
            }
        }
    },
    age: function (message) {
        const snowflakes = (message.content.match(/\d+/g) || [message.author.id]).filter(match => match.length > 15);
        snowflakes.forEach(async snowflake => {
            const deconstructed_snowflake = DiscordJS.SnowflakeUtil.deconstruct(snowflake);
            if (deconstructed_snowflake.timestamp === 1420070400000) { //that seems to be the default time when the ID was not found
                util.sendTextMessage(message.channel, "Unknown ID");
                return;
            }
            //Figure out the origin of the ID
            let target_string;
            if (server.members.cache.get(snowflake)) { //is it a server member?
                target_string = `member ${server.members.cache.get(snowflake)}`;
            }
            else if (server.roles.cache.get(snowflake)) { //a role?
                const role = server.roles.cache.get(snowflake);
                if (role?.id === server.id) { //the everyone role ID is the same as the server ID, let's assume they meant the server and not the role
                    target_string = `server **${server.name}**`;
                }
                else { //a role that is not the everyone role
                    target_string = `role ${server.roles.cache.get(snowflake)}`;
                }
            }
            else if (server.channels.cache.get(snowflake)) { //a channel?
                target_string = `channel ${server.channels.cache.get(snowflake)}`;
            }
            else if (server.emojis.cache.get(snowflake)) { //an emoji?
                target_string = `emoji ${server.emojis.cache.get(snowflake)}`;
            }
            else {
                const user = await client.users.fetch(snowflake).catch(err => { return null; });
                if (user) { //a user who is not a guild member?
                    target_string = `user ${client.users.cache.get(snowflake)}`;
                }
                else { //ok I give up
                    //unfortunately we can't look up servers by ID
                    target_string = `unknown ID **${snowflake}**`;
                }
            }
            //add generic fields Created and Age
            let embed = new DiscordJS.MessageEmbed().setDescription(`Age of ${target_string}`);
            embed.addField("Created", `${deconstructed_snowflake.date.toUTCString()}`);
            embed.addField("Age", `${util.time((new Date).getTime() - deconstructed_snowflake.timestamp)}`);
            const member = server.members.cache.get(snowflake);
            let ant_date = new Date();
            ant_date.setFullYear(2019, 7, 5);
            const member_age = member ? (snowflake === "201478077749002240" ? ant_date : member.joinedAt) : null;
            if (member_age) { //add member fields Joined, Member Since and Eligible
                const now = new Date().getTime();
                const ancient_date = new Date(member_age.getTime() + 365*24*60*60*1000);
                const ancient_string = ancient_date.getTime() <= now ? "Yes" : `on ${ancient_date.toUTCString()} in ${util.time(ancient_date.getTime() - now)}`;
                embed.addField("Joined", `${member_age.toUTCString()}`);
                embed.addField("Member Since", `${util.time(new Date().getTime() - member_age.getTime())}`);
                embed.addField(`Eligible For Ancient Role`, `${ancient_string}`);
            }
            util.sendTextMessage(message.channel, embed);
        });
    },
    pfp: function (message) { //display profile picture of a user
        const snowflakes = (message.content.match(/\d+/g) || [message.author.id]).filter(match => match.length > 15);
        snowflakes.forEach(snowflake => {
            client.users.fetch(snowflake).then(user => {
                if (user) {
                    util.sendTextMessage(message.channel, new DiscordJS.MessageEmbed().setDescription(`${user}'s Avatar`).setImage(user.displayAvatarURL() + "?size=2048"));
                }
                else {
                    util.sendTextMessage(message.channel, new DiscordJS.MessageEmbed().setDescription(`Invalid User: <@${snowflake}>`));
                }
            }).catch(error => util.sendTextMessage(message.channel, `Invalid user ID: <@${snowflake}>`));
        });
    },
    audit: function (message) {
        if (!util.isStaff(message)) {
            util.sendTextMessage(message.channel, `${message.author} You audition for a porn movie where you get used like a slut.\n` +
                `The audition video sells well, but you never hear from them again.`);
            return;
        }
        const snowflakes = (message.content.match(/\d+/g) || [message.author.id]).filter(match => match.length > 15);
        snowflakes.forEach(async snowflake => {
            if (server.members.cache.has(snowflake)) { //is it a server member?
                audit_log_search(`member ${server.members.cache.get(snowflake)}`, message, snowflake);
            }
            else if (server.roles.cache.has(snowflake)) { //a role?
                if (snowflake === server.id) {
                    audit_log_search(`role ${server.roles.cache.get(snowflake)} / server ${server.name}`, message, snowflake);
                }
                else {
                    audit_log_search(`role ${server.roles.cache.get(snowflake)}`, message, snowflake);
                }
            }
            else if (server.channels.cache.has(snowflake)) { //a channel?
                audit_log_search(`channel ${server.channels.cache.get(snowflake)}`, message, snowflake);
            }
            else if (server.emojis.cache.has(snowflake)) { //an emoji?
                audit_log_search(`emoji ${server.emojis.cache.get(snowflake)}`, message, snowflake);
            }
            else {
                const user = await client.users.fetch(snowflake).catch(err => { return null; });
                if (user) { //a user who is not a guild member?
                    audit_log_search(`user ${client.users.cache.get(snowflake)}`, message, snowflake);
                }
                else { //ok I give up
                    util.sendTextMessage(message.channel, new DiscordJS.MessageEmbed().setDescription(`Wtf is that ID?`));
                }
            }
        });
    },
    slowmode: async function (message) {
        if (!util.isStaff(message)) {
            util.sendTextMessage(message.channel, `${message.author} Too slow!`);
            return;
        }
        if (!("setRateLimitPerUser" in message.channel)) {
            util.sendTextMessage(message.channel, `Error: Command unavailable in this discord.js version. Required version: 11.5.0+`);
            return;
        }
        const matches = message.content.match(/(?:\d){18}/g) || [message.channel.id];
        let target_channels: DiscordJS.Snowflake[] = [];
        for (const match of matches) {
            const target_channel = server.channels.cache.get(match);
            if (!target_channel) {
                util.sendTextMessage(message.channel, `Error: Unknown ID ${match}`);
                return;
            }
            if (target_channel instanceof DiscordJS.TextChannel) {
                target_channels.push(target_channel.id);
            }
            else if (target_channel instanceof DiscordJS.CategoryChannel) {
                target_channel.children.forEach(channel => {
                    if (channel instanceof DiscordJS.TextChannel) {
                        target_channels.push(channel.id);
                    }
                });
            }
            else {
                util.sendTextMessage(message.channel, `Error: Cannot set slowmode on non-text non-category channel <#${match}>`);
                return;
            }
        }
        if (target_channels.length === 0) {
            target_channels.push(message.channel.id);
        }
        const hours = parseInt(message.content.match(/\d+h/g)?.[0] || "0");
        const minutes = parseInt(message.content.match(/\d+m/g)?.[0] || "0");
        const seconds = parseInt(message.content.match(/\d+s/g)?.[0] || "0");
        const time_s = hours * 60 * 60 + minutes * 60 + seconds;
        const time_str = `${hours}h ${minutes}m ${seconds}s`;
        for (const id of target_channels) {
            if (message.channel instanceof DiscordJS.DMChannel) return;
            const target_channel = server.channels.cache.get(id);
            if (!target_channel || !(target_channel instanceof DiscordJS.TextChannel)) {
                return;
            }
            try {
                await target_channel.setRateLimitPerUser(time_s, `Set by @${message.author.tag} in #${message.channel.name}`);
                util.log(`${message.author} set the slowmode in ${target_channel} to ${time_str}.`, `Channel Administration`, util.logLevel.INFO);
            }
            catch (error) {
                util.sendTextMessage(message.channel, `Failed setting slowmode to ${time_str} because of:\n${error}`);
                util.log(`${message.author} failed setting slowmode in ${target_channel} to ${time_str} because of:\n${error}`, `Channel Administration`, util.logLevel.ERROR);
                return;
            };
        };
        if (time_s === 0) {
            util.sendTextMessage(message.channel, `Successfully removed slowmode in${target_channels.reduce((curr, id) => `${curr} <#${id}>`, "")}.`);
        }
        else {
            util.sendTextMessage(message.channel, `Successfully set slowmode in${target_channels.reduce((curr, id) => `${curr} <#${id}>`, "")} to ${time_str}.`);
        }
    },
    sm: function (message) {
        cmd.slowmode(message);
    },
    cultinfo: async function (message) {
       message.channel.startTyping();
        try {
            const messages = await channels.cult_info.messages.fetch({limit: 1});
            let cultMsg = messages.first();
            if (!cultMsg || !cultMsg.mentions.roles) {
                message.channel.stopTyping();
                return;
            }
            const embed = new DiscordJS.MessageEmbed()
                .setAuthor(`Cult Info`)
                .setTimestamp(new Date());
            let cults: {
                icon: string;
                role: DiscordJS.Role;
                leader: DiscordJS.User;
                memberCount: number;
            }[] = [];
            for (const line of cultMsg.content.split("\n")) {
                const matches = line.match(/(\S+)[^<]*<@&(\d+)>[^<]*<@!?(\d+)>/);
                if (!matches) continue;
                const icon = matches[1];
                const role = server.roles.cache.get(matches[2]);
                if (!role) continue;
                const leader = client.users.cache.get(matches[3]);
                if (!leader) continue;
                const memberCount = role.members.size;
                cults.push({icon, role, leader,memberCount});
            }
            cults = cults.sort((a,b) => b.memberCount - a.memberCount);
            const description = cults.reduce((curr, cult) =>
                `${curr}`+
                `${cult.icon} ${cult.role}\n` +
                `Leader: ${cult.leader}\n` +
                `**${cult.memberCount}** members\n\n`, "");
            embed.setDescription(description);
            await message.channel.send(embed);
            message.channel.stopTyping();
        }
        catch (err) {
            util.log(err, 'cultInfo', util.logLevel.ERROR);
            message.channel.stopTyping();
        }
    },
    role: function(message, args) {
        return cmd.roles(message, args);
    },
    roles: function (message, args) {
        if (!util.isStaff(message)) { //the commands are really spammy
            return;
        }
        if (args?.length === 0) {
            util.sendTempTextMessage(message.channel, 'That didn\'t work out... maybe try `_roles who <roleID>` or `_roles usage` or `_roles usage list`');
            return;
        }
        if (args?.[0] === "usage") {
            args = args.slice(1);
            return cmd["roles usage"](message, args);
        }
        if (args?.[0] === "who") {
            return cmd["roles who"](message);
        }
        if (args?.[0] === "purge") {
            return cmd["roles purge"](message);
        }
        util.sendTempTextMessage(message.channel, 'That didn\'t work out... maybe try `_roles who <roleID>` or `_roles usage` or `_roles usage list`');
    },
    "roles usage": function (message, args) { //list all the roles and their usage; args can only be "list"
        let sortOrder = "";
        if (args && args[0] === "list") {
            sortOrder = "list";
        }
        let roles = new DiscordJS.Collection<DiscordJS.Snowflake, number>();
        server.roles.cache.forEach(role => roles.set(role.id, 0));
        server.members.cache.forEach(member => {
            member.roles.cache.forEach(role => roles.set(role.id, (roles.get(role.id) || 0) + 1));
        });

        roles = roles.sort((count_left, count_right, role_left, role_right) => {
            const left_role = server.roles.cache.get(role_left);
            const right_role = server.roles.cache.get(role_right);
            if (!left_role || !right_role) {
                //something is very broken
                return 0;
            }
            if (sortOrder !== "list") {
                if (count_right - count_left) { //sort by use-count first
                    return count_right - count_left;
                }
                //sort by name second
                return left_role.name < right_role.name ? -1 : 1;
            } else if (sortOrder === "list") { //sort by name second
                return DiscordJS.Role.comparePositions(right_role, left_role);
            }
            return 0;
        });
        const roles_str = roles.reduce((current, count, role) => current + `${server.roles.cache.get(role)}: ${count}\n`, "");
        util.sendTextMessage(message.channel, new DiscordJS.MessageEmbed().setDescription(`${roles.size}/250 roles:\n${roles_str}`));
    },
    "roles who": function (message) { //list the members who have a certain role
        const ids = message.content.match(/\d+/g);
        if (!ids) {
            util.sendTempTextMessage(message.channel, 'Please specify the ID of the role you want to check on!');
            return;
        }
        ids.forEach(id => {
            const role = server.roles.cache.get(id);
            if (!role) return;
            const users_str = server.members.cache.reduce((curr, member) => {
                if (member.roles.cache.has(role.id)) {
                    curr += `${member} `;
                }
                return curr;
            }, "");
            util.sendTextMessage(message.channel, new DiscordJS.MessageEmbed().setDescription(`Users with role ${role}:\n${users_str}`));
        });
    },
    "roles purge": async function (message) {
        if (message.author.id !== "591241625737494538") return;
        const matches = message.content.match(/(?:\d){18}/g);
        if (!matches) return;
        for (const index in matches) {
            let counter = 0;
            const match = matches[index];
            const role = server.roles.cache.get(match);
            if (!role) {
                util.sendTextMessage(message.channel, `Failed finding role with ID ${match}.`);
                continue;
            }
            for (const [, member] of server.members.cache) {
                if (member.roles.cache.has(match) && !member.roles.cache.has(roles.Cult_leader.id)) {
                    await member.roles.remove(match);
                    counter++;
                }
            }
            util.sendTextMessage(message.channel, new DiscordJS.MessageEmbed().setDescription(`Removed <@&${match}> from ${counter} members.`));
        }
    },
    call: async function (message) {
        const args = message.content.slice(prefix.length).trim().split(/ +/g);
        const command = args.shift()?.toLowerCase() || "";
        try {
            if (command === "call") return;
            if (!this[command]) return;
            if (command in this) {
                this[command](message, args);
                util.log(`${message.author} is calling command: \`${message.content}\`\n[link](${message.url})`, command, util.logLevel.INFO);
            }
        } catch (e) {
            util.log(`Failed to process (${command})`, command, util.logLevel.ERROR);
        }
    },
    stop_typing: function (message) {
        message?.channel.stopTyping(true);
    },
    raid: async function(message) {
        if (!util.isStaff(message)) {
            util.sendTextMessage(message.channel, `Call the mods!`);
            return;
        }
        await roles.NSFW.setPermissions(roles.NSFW.permissions.bitfield & ~DiscordJS.Permissions.FLAGS.CREATE_INSTANT_INVITE, "Raid");
        server.fetchInvites()
        .then(invs => {
            invs.forEach(inv => {
                inv.delete("Raid");
            });
        });
        util.react(message, '✅');
        util.log(`Disabled invite creation and deleted invites`, "Raid", util.logLevel.WARN);
    },
    trim_reacts: async function (commandmessage) {
        const messages = await channels.roles_selection.messages.fetch();
        for (const [messageid, message] of messages) {
            util.sendTextMessage(commandmessage.channel, `Trimming ${message.url}`);
            for (const [reactionid, reaction] of message.reactions.cache) {
                const users = await reaction.users.fetch();
                for (const [userid, user] of users) {
                    if (!user.bot) {
                        await reaction.users.remove(userid);
                    }
                }
            }
        }
        util.react(commandmessage, "✅");
    },
    ca: async function (message) {
        return this.chararchive(message);
    },
    chararchive: async function (message) {
        if (!util.isStaff(message)) {
            util.sendTextMessage(message.channel, `<#534863007860129792>`);
            return;
        }
        const archive_channel = <DiscordJS.TextChannel>server.channels.cache.get("534863007860129792");
        if (!archive_channel) {
            util.sendTextMessage(message.channel, `Failed finding character archive channel`);
            return;
        }
        const snowflakes = message.content.match(/(?:\d){18}/g) || [archive_channel.lastMessageID];
        if (snowflakes.length !== 1) {
            util.sendTextMessage(message.channel, `Please don't specify multiple IDs.`);
            return;
        }
        const snowflake = snowflakes[0];
        if (!snowflake) {
            util.sendTextMessage(message.channel, "Failed getting last archive messge");
            return;
        }
        dead_char_search(snowflake, message, archive_channel);
    },
    banish: function (message) { //banish ID|Mention Channel|ChannelID|CategoryID|"Prefix"+
        if (!util.isStaff(message)) {
            util.sendTextMessage(message.channel, `${message.author} has been banished to the shadow realm!`);
            return;
        }
        let channels: string[] = []; //the channels to set permissions for
        let target: string = ""; //the member ID to set permissions for
        let error: string = ""; //errors that occured
        const snowflakes = (message.content.match(/(?:\d+){18}/g) || []);
        snowflakes.forEach(snowflake => {
            if (server.members.cache.has(snowflake)) {
                if (target) { //duplicate target user, bad
                    error += "Too many members specified\n";
                    return;
                }
                target = snowflake;
                return;
            }
            const channel = server.channels.cache.get(snowflake)
            if (channel) {
                if (channel.type === "category") {
                    channels = channels.concat((<DiscordJS.CategoryChannel>channel).children.keyArray());
                    return;
                }
                channels.push(snowflake);
                return;
            }
            error += "Unknown ID: " + snowflake + "\n";
        });
        const prefix_matches = message.content.match(/"[^"]*"/g);
        if (prefix_matches) {
            prefix_matches.forEach(prefix_match => {
                prefix_match = prefix_match.slice(1, -1); //remove the "
                let matchcount = 0;
                server.channels.cache.forEach(channel => {
                    if (channel.name.startsWith(prefix_match)) {
                        channels.push(channel.id);
                        matchcount++;
                    }
                });
                if (matchcount === 0) {
                    error += `No channels match ${prefix_match}\n`
                }
            });
        }
        if (!target) {
            util.sendTextMessage(message.channel, `Error: Target user not specified`);
            return;
        }
        if (channels.length === 0) {
            util.sendTextMessage(message.channel, `Error: Channel(s) not specified`);
            return;
        }
        if (error) {
            util.sendTextMessage(message.channel, error);
            return;
        }
        const summary = channels.reduce((current, snowflake) => {
            const channel = server.channels.cache.get(snowflake);
            if (!channel) {
                return `${current} Invalid channel ${snowflake}`
            }
            channel.updateOverwrite(target, {VIEW_CHANNEL: false}, `${message.author.username}#${message.author.discriminator} banished ${server.members.cache.get(target)?.user.username} from ${channel.name}`);
            return `${current} <#${snowflake}>`;
        }, "")
        util.sendTextMessage(message.channel, new DiscordJS.MessageEmbed().setDescription(`Banished <@${target}> from ${summary}`));
    },
    perms: async function (message) {
        if (!util.isStaff(message)) {
            util.sendTextMessage(message.channel, `${message.author} had their horny license revoked!`);
            return;
        }
        const member = server.members.cache.get(message.author.id);
        if (!member) return;
        let applied_channels: DiscordJS.GuildChannel[] = [];
        let applied_targets: (DiscordJS.GuildMember | DiscordJS.Role) [] = [];
        let granted_permissions = 0;
        let neutral_permissions = 0;
        let denied_permissions = 0;
        let clearing = false;
        for (const part of message.content.split(/\s+/).splice(1)) {
            const snowflake_match = part.match(/(?:<(?:@|#)!?(\d{18})>)|(\d{18})/) || [];
            const snowflake = snowflake_match[1] || snowflake_match[2];
            if (snowflake) {
                const member = server.members.cache.get(snowflake);
                if (member) {
                    applied_targets.push(member);
                    continue;
                }
                const channel = server.channels.cache.get(snowflake);
                if (channel) {
                    if (channel.type === "category") {
                        const category = <DiscordJS.CategoryChannel>(channel);
                        applied_channels.push(...category.children.values());
                    }
                    else {
                        applied_channels.push(channel);
                    }
                    continue;
                }
                const role = server.roles.cache.get(snowflake);
                if (role) {
                    applied_targets.push(role);
                    continue;
                }
                util.sendTextMessage(message.channel, `Error: I don't know what ID ${snowflake} refers to.`);
                return;
            }
            if (part === "clear") {
                clearing = true;
                continue;
            }
            if ("+-/".includes(part[0])) {
                const command = part.substr(1);
                const perm = permissions_map.get(command);
                if (perm) {
                    if (part[0] === "+") {
                        granted_permissions |= perm;
                    }
                    if (part[0] === "-") {
                        denied_permissions |= perm;
                    }
                    if (part[0] === "/") {
                        neutral_permissions |= perm;
                    }
                    continue;
                }
                else {
                    util.sendTextMessage(message.channel, `Invalid permission \`${command}\`. Check <https://discord.com/developers/docs/topics/permissions> for a list of valid permissions.`);
                    return;
                }
            }
            if (part[0] === "\"" && part.slice(-1) === "\"") {
                for (const [snowflake, channel] of server.channels.cache) {
                    if (channel.name.startsWith(part.slice(1, -1))) {
                        applied_channels.push(channel);
                    }
                }
                continue;
            }
            if (permissions_map.has(part)) {
                util.sendTextMessage(message.channel, `Error: The permission ${part} needs to be prefixed by a + to grant the permission, - to deny the permission or / to use the default.`);
                return;
            }
            util.sendTextMessage(message.channel, `Error: I don't know what to do with \`${part}\`.`);
            return;
        }
        if (applied_channels.length === 0) {
            util.sendTextMessage(message.channel, `Error: No target channel(s) to set permissions for were specified.`);
            return;
        }
        if (applied_targets.length === 0) {
            util.sendTextMessage(message.channel, `Error: No target user(s) and/or role(s) to set permissions for were specified.`);
            return;
        }
        if (granted_permissions === 0 && denied_permissions === 0 && neutral_permissions === 0 && clearing === false) {
            util.sendTextMessage(message.channel, `Error: No permissions were specified.`);
            return;
        }
        if ((granted_permissions !== 0 || denied_permissions !== 0) && clearing) {
            util.sendTextMessage(message.channel, `Error: Conflicting permissions: Permissions are being set and cleared at the same time.`);
            return;
        }
        if (granted_permissions & DiscordJS.Permissions.FLAGS.MANAGE_CHANNELS && !member.permissions.has(DiscordJS.Permissions.FLAGS.ADMINISTRATOR)) {
            util.sendTextMessage(message.channel, `${message.author} Sorry, you need to be an administrator to hand out manage channel permissions.`);
            return;
        }
        function getOverwrites(allow: number, deny: number, reset: number, original: number): DiscordJS.PermissionOverwriteOption {
            let result: DiscordJS.PermissionOverwriteOption = {};
            for (const [name, perm] of permissions_map) {
                if (perm & allow) {
                    (result as any)[name] = true;
                    continue;
                }
                if (perm & deny) {
                    (result as any)[name] = false;
                    continue;
                }
                if (perm & reset) {
                    (result as any)[name] = null;
                    continue;
                }
                (result as any)[name] = perm & original;
            }
            return result;
        }
        message.channel.startTyping();
        for (const channel of applied_channels) {
            for (const member_or_role of applied_targets) {
                try {
                    if (clearing) {
                        channel.permissionOverwrites.delete(member_or_role.id);
                        await channel.overwritePermissions(channel.permissionOverwrites);
                    }
                    else {
                        await channel.updateOverwrite(member_or_role, getOverwrites(granted_permissions, denied_permissions, neutral_permissions, channel.permissionsFor(member_or_role.id)?.valueOf() || 0), `perms command ${message.channel.id}/${message.id}`);
                    }
                } catch(error) {
                    await message.channel.send(new DiscordJS.MessageEmbed().setDescription(`Error setting permissions for ${member_or_role} in ${channel} because ${error}.`));
                    message.channel.stopTyping();
                    return;
                }
            }
        }
        if (clearing) {
            await message.channel.send(new DiscordJS.MessageEmbed().setDescription(
                `Permissions cleared ` +
                `for${applied_targets.reduce((curr, member_or_roll) => `${curr} ${member_or_roll}`, "")} ` +
                `in channel(s)${applied_channels.reduce((curr, channel) => `${curr} ${channel}`, "")}`));
        }
        else {
            await message.channel.send(new DiscordJS.MessageEmbed().setDescription(
                `Permission(s) ` +
                `${granted_permissions ? `[${permission_to_string(granted_permissions)}] **granted** ` : ""}` +
                `${denied_permissions ? `[${permission_to_string(denied_permissions)}] **denied** ` : ""}` +
                `${neutral_permissions ? `[${permission_to_string(neutral_permissions)}] **reset** ` : ""}` +
                `for${applied_targets.reduce((curr, member_or_roll) => `${curr} ${member_or_roll}`, "")} ` +
                `in channel(s)${applied_channels.reduce((curr, channel) => `${curr} ${channel}`, "")}`));
        }
        message.channel.stopTyping();
    },
    adban: function (message) {
        if (!util.isStaff(message)) {
            util.sendTextMessage(message.channel, `${message.author}, consider yourself ad banned!`);
            return;
        }
        message.content = `${message.content} -VIEW_CHANNEL ${categories.playing_with} ${categories.playing_as} ${categories.by_type}`;
        cmd.perms(message);
    },
    adunban: function (message) {
        if (!util.isStaff(message)) {
            util.sendTextMessage(message.channel, `${message.author} hmpf`);
            return;
        }
        message.content = `${message.content} clear ${categories.playing_with} ${categories.playing_as} ${categories.by_type}`;
        cmd.perms(message);
    },
    ban: async function (message) {
        if (!util.isStaff(message)) {
            util.sendTextMessage(message.channel, `${message.author} ${emojis.bancat}`);
            return;
        }
        const snowflakes = (message.content.match(/\d+/g) || []).filter(match => match.length > 15);
        var result = "";
        for (const snowflake of snowflakes) {
            try {
                result += `Banned ${await server.members.ban(snowflake)}\n`;
            }
            catch (e) {
                result += `Failed banning <@${snowflake}>: ${e}\n`;
            }
        }
        message.reply(result);
    },
    help: function (message) {
        const public_commands = `
**\`_ping\`**
Show practical reaction delay and Discord delay.

**\`_staff\`**
Checks if you are staff.

**\`_age\`** \`[@user|#channel|emoji|ID]*\`
Display the age of an ID. If the ID is of a member of the server also display when they joined and will be eligible for the ancient role. If you don't specify an ID it displays your own info.

**\`_pfp\`** \`[@user|userID]*\`
Display the profile picture of a user in big.

**\`_cultinfo\`**
Displays a list of the current cults and their symbol, cult role, leader and number of members sorted by members.

**\`_stats\`** \`[#channel|#category|prefix|ID]*\`
Displays a list of channels and the number of messages, chatters and readers for the specified channel(s) for the last 28 days. Try \`_stats #💬ooc-general #🧚rp-general\` to compare the general chats or \`_stats 🐎\` to see how active the Ram Ranch cult is. Note that this only updates once every few days or so.

**\`_inactive\`**
Displays a list of channels that are currently considered inactive and may get deleted next weekend. Note that this only updates every couple of days and that new channels get a grace period.

**\`_help\`**
Display this text.`
        const staff_commands = `
***\`_warn\`*** \`[@user] [?reason]\`
Applies appropriate warning role (Warned 1x or Warned 2x), sends a DM about the warning and enters it into database.

***\`_stopmention\`***
Makes me no longer listen to non-staff.

***\`_startmention\`***
Makes me listen to non-staff again.

***\`_cn\`***
Kick newcomers who do not have the NSFW role for over 10 minutes. The command is run automatically every full hour.

***\`_clear\`*** \`[number]\`
Deletes the laste [number] messages.

***\`_audit\`*** \`[mention|ID]*\`
Go through the last 10000 audit entries and display all entries (up to message limit) that contain moderator action of the given target. This command tends to take ~10-20 seconds, please be patient.

***\`_slowmode\`*** | ***\`_sm\`*** \`[#channel|channelID|categoryID]* [number][h|m|s]*\`
Sets slowmode to the channel. Example: \`_slowmode #🔞general 30s 2m\`. The time is optional and defaults to 0. The maximum time is 6 hours. Use this command if you need to set a slowmode that is not supported by the UI such as 4 hours.

***\`_role(s) usage\`***
Displays a list of all roles and the number of their uses sorted by use-count.

***\`_role(s) usage list\`***
Displays a list of all roles and the number of their uses sorted by name.

***\`_role(s) who\`*** \`[@role|roleID]*\`
Displays a list of members who have the specified role(s).

***\`_chararchive\`*** | ***\`_ca\`*** \`[messageID]?\`
Displays a list of links to <#534863007860129792> messages that contain a mention of a user that is not a member. The character archive is searched starting the specified messageID or the latest message. Displays the oldest messageID searched for to continue searching.

***\`_banish\`*** \`[userID] [channelID]* [categoryID]* ["prefix"]*\`
Hides the given channels from the given user. The channels can be specified directly, by specifying a category or using a prefix. For example \`_banish 315977186383364096 (user ID) ":wine_glass:" (Cult prefix)\` hides the Debaucherous Bastards cult from that user. \`_banish 315977186383364096 (user ID) 616685364186316820 (fun corner ID)\` hides the Fun Corner from the user.

***\`_perms\`*** \`([user]|[role])+ ([channel]|[category]|["prefix"])+ [+|-|/[PERMISSION])|clear]+\`
Sets the given permission(s) for the user and/or role in the given channel(s). You can [look up valid [PERMISSIONS] here in the "Bitwise Permission Flags" table](https://discord.com/developers/docs/topics/permissions#permissions-bitwise-permission-flags). Note that permissions only work in text channels if there is a T in the last column and in voice channels only if there is a V in the last column.
Alternatively you can use \`clear\` as the [PERMISSION] which will remove the user(s)/role(s) from the channel(s) permission list.
Example: \`_perms @Lilli -ADD_REACTIONS #tinkering\`

***\`_adban\`*** \`[userID]+\`
Hides the playing with/as/type categories from the specified user(s).

***\`_adunban\`*** \`[userID]+\`
Hides the playing with/as/type categories from the specified user(s).`;
        util.sendTextMessage(message.channel, new DiscordJS.MessageEmbed().setDescription(`I understand the following commands:
${public_commands}
${util.isStaff(message) ? staff_commands : ""}`))},
};

const fnct = {
    serverStats: function (modes: string[]) {
        try {
            modes.forEach(mode => {
                let channel = "";
                let str = "";
                switch (mode) {
                    case "users":
                        channel = "582321301142896652";
                        str = "📊User Count: " + server.members.cache.filter(member => !member.user.bot).size;
                        break;
                    case "online":
                        channel = "582321302837133313";
                        str = "📊Online users: " + server.members.cache.filter(member => !member.user.bot && member.user.presence.status !== "offline").size;
                        break;
                    case "new":
                        channel = "582309343274205209";
                        str = "📈New users: " + server.members.cache.filter(member => !member.user.bot && ((new Date().getTime() - (member.joinedTimestamp || 0)) / 1000 / 60 / 60 / 24) <= 1).size;
                        break;
                    case "bots":
                        channel = "582309344608124941";
                        str = "🤖Bot Count: " + server.members.cache.filter(member => member.user.bot).size;
                        break;
                    case "roles":
                        channel = "606773795142893568";
                        str = "🎲Roles: " + server.roles.cache.size;
                        break;
                    case "channels":
                        channel = "606773807306506240";
                        str = "📇Channels: " + server.channels.cache.size;
                        break;
                    case "age":
                        channel = "606773822284365874";
                        let age = Math.floor((new Date().getTime() - server.createdTimestamp) / 1000 / 60 / 60 / 24);
                        let ageDays = age % 365;
                        let ageDstr = `${ageDays > 0 ? ageDays + (ageDays > 1 ? ' days' : ' day') : '0 days'}`;
                        let ageYears = Math.floor(age / 365);
                        let ageYstr = `${ageYears > 0 ? ageYears + (ageYears > 1 ? ' years ' : ' year ') : ''}`;
                        str = `📅Age: ${ageYstr} ${ageDstr}`;
                        break;
                    default:
                        break;
                }
                server.channels.cache.get(channel)?.setName(str);
            });
        } catch (e) {
            util.log(`Failed to update server stats for ${modes}: ${e}`, 'Server Stats', util.logLevel.ERROR);
        }
    },
    approveChar: function(message: DiscordJS.Message, reaction: DiscordJS.ReactionEmoji, user: DiscordJS.User) {
        try {
            if (!(message.channel instanceof DiscordJS.TextChannel)) return;
            if (message.channel.name === channels.char_sub.name && util.isUserStaff(user)) {
                const msgType = reaction.name === "⭐" ? 1 : reaction.name === "✅" ? 2 : 0;
                if (msgType === 0) {
                    return;
                }
                let msgAttachments = message.attachments.map(a => a.url);
                let msgImagesString = "";
                msgAttachments.forEach(imgUrl => msgImagesString += imgUrl + "\n");
                util.log(`${user} approved character message:\n ${message.content}\n ${msgImagesString}`, "approveCharacter", util.logLevel.INFO);
                let msgContent = `User: ${message.author}\n${message.content}`;
                channels.char_archive.send(msgType === 1 ? msgContent : message.content, { files: msgAttachments })
                    .then(msg => {
                        if (msgType === 1) {
                            channels.char_index.send(`\`${message.author} Your character has been approved and can be found in the index under \"\".\``);
                        }
                        let msgImages = msg.attachments.map(a => `<${a.url}>`);
                        let msgImagesString = "";
                        msgImages.forEach(imgUrl => msgImagesString += imgUrl + "\n");
                        channels.char_index.send(`\`r!addchar \"charName\"\n\``);
                        channels.char_index.send(`\`${message.content}\``);
                        channels.char_index.send(`${msgImagesString}`);
                    });
            }
        } catch (e) {
            util.log(e, 'approveCharacter', util.logLevel.ERROR);
        }
    }
};

const split_text_message = (message: string) => {
    let message_pieces;
    try {
        //try splitting after newlines
        message_pieces = DiscordJS.Util.splitMessage(message);
    } catch (error) {
        //fall back to splitting after spaces
        message_pieces = DiscordJS.Util.splitMessage(message, {char: ' '});
    }
    return Array.isArray(message_pieces) ? message_pieces : [message_pieces]; //always return an array
};

const util = {
    sendTextMessage: function (channel: DiscordJS.TextChannel | DiscordJS.DMChannel | DiscordJS.NewsChannel, message: DiscordJS.MessageEmbed | string) {
        try {
            channel.startTyping();
            const message_pieces = split_text_message(typeof message === "string" ? message : message.description || "");
            setTimeout(function(){
                message_pieces.forEach(message_piece => {
                    if (message instanceof DiscordJS.MessageEmbed) {
                        channel.send(new DiscordJS.MessageEmbed(message).setDescription(message_piece));
                    }
                    else {
                        channel.send(message_piece);
                    }
                });
                channel.stopTyping();
            }, 500);
        } catch (e) {
            const text = typeof message ==="string" ? message : message.description || "";
            this.log('Failed to send message: ' + text.slice(1970), "", this.logLevel.ERROR);
            channel.stopTyping();
        }
    },
    sendTempTextMessage: function (channel: DiscordJS.TextChannel | DiscordJS.DMChannel | DiscordJS.NewsChannel, message: string, embed?: DiscordJS.MessageEmbed) {
        try {
            if (!channel) {
                return;
            }
            channel.startTyping();
            const message_pieces = split_text_message(message);
            setTimeout(function(){
                message_pieces.forEach(message_piece => {
                    if (embed) {
                        channel.send(new DiscordJS.MessageEmbed(embed).setDescription(message_piece))
                            .then(d => setTimeout(() => d.delete(), 5000));
                    }
                    else {
                        channel.send(message_piece)
                            .then(d => setTimeout(() => d.delete(), 5000));;
                    }
                });
                channel.stopTyping();
            }, 500);
        } catch (e) {
            this.log('Failed to send message: ' + message.slice(1970), "", this.logLevel.ERROR);
            channel.stopTyping();
        }
    },
    isStaff: function (message: DiscordJS.Message) {
        return this.isUserStaff(message.author);
    },

    isUserStaff: function (user: DiscordJS.User) {
        const member = server.members.cache.get(user.id);
        if (!member) return;
        if (member.permissions.has(DiscordJS.Permissions.FLAGS.ADMINISTRATOR)) return true;
        return member.roles.cache.has(roles.STAFF.id) || member.roles.cache.has(roles.TRIALMOD.id);
    },

    log: function (message: string, moduleName: string, level: string) {
        let embedColor = 0xE0FFFF;
        switch (level) {
            case util.logLevel.WARN:
                embedColor = 0xFFD700;
                break;
            case util.logLevel.ERROR:
                embedColor = 0xFF7F50;
                break;
            case util.logLevel.FATAL:
                embedColor = 0xDC143C;
                break;
            default:
                break;
        }
        let currDateTime = moment().format('MMM DD YYYY - HH:mm:ss.SSS');
        let logMessage = level + " | " + currDateTime + " | " + moduleName + ": " + message;

        util.sendTextMessage(channels.accalia_logs, new DiscordJS.MessageEmbed()
        .setAuthor(level)
        .setColor(embedColor)
        .setDescription(message)
        .setFooter(moduleName)
        .setTimestamp(new Date()));
        console.log(logMessage);
    },

    logLevel: {
        INFO:  "INFO",
        WARN:  "WARN",
        ERROR: "**ERROR**",
        FATAL: "__**FATAL**__",
    },

    image_link_count: function (message: DiscordJS.Message) {
        return message.embeds.length + message.attachments.size;
    },

    level_to_role: function (level: number) {
        if (level < 5) {
            return lvl_roles.LVL_0;
        } else if (level < 10) {
            return lvl_roles.LVL_5;
        } else if (level < 20) {
            return lvl_roles.LVL_10;
        } else if (level < 30) {
            return lvl_roles.LVL_20;
        } else if (level < 40) {
            return lvl_roles.LVL_30;
        } else if (level < 50) {
            return lvl_roles.LVL_40;
        } else if (level < 60) {
            return lvl_roles.LVL_50;
        } else if (level < 70) {
            return lvl_roles.LVL_60;
        } else if (level < 80) {
            return lvl_roles.LVL_70;
        } else if (level < 90) {
            return lvl_roles.LVL_80;
        } else if (level < 100) {
            return lvl_roles.LVL_90;
        }
        return lvl_roles.LVL_100;
    },

    handle_level_up: async function(message: DiscordJS.Message) {
        const member = await message.mentions.members?.first()?.fetch();
        if (!member) return;
        const user = member.user;
        const level_string = message.content.match(/level \d+/g)?.[0];
        if (!level_string) return;
        const level = parseInt(level_string.match(/\d+/g)?.[0] || "");

        const new_role = util.level_to_role(level);
        const is_lvl_role = (role_id: DiscordJS.Snowflake) => {
            for (const name in lvl_roles) {
                if (role_id === (<DiscordJS.Role>(lvl_roles as any)[name]).id) return true;
            }
            return false;
        }
        const updated_roles = member.roles.cache.filter(role =>  !is_lvl_role(role.id)).set(new_role.id, new_role);
        const added_roles = updated_roles.filter(role => !member.roles.cache.has(role.id));
        const removed_roles = member.roles.cache.filter(role => !updated_roles.has(role.id));
        if (added_roles.size === 0 && removed_roles.size === 0) return;
        const role_gain_string = added_roles.reduce((curr, role) => curr + `${role}`, "");
        const role_lose_string = removed_roles.reduce((curr, role) => curr + `${role}`, "");

        util.log(`${(added_roles.size !== 1 || removed_roles.size !== 1) ? "⚠ Incorrect role change: " : ""}${user} gained level ${level}, so added [${role_gain_string}] and removed [${role_lose_string}]`, level_up_module, util.logLevel.INFO);

        if (removed_roles.size === 0) {
            const old_role = util.level_to_role(level - 1);
            util.log(`Expected to find role ${old_role} with ID ${old_role.id} on user ${user}, but didn't. Roles found: ${
                member.roles.cache.reduce((curr, role) => `${curr} ${role} (${role.id})`, "")
            }`, level_up_module, util.logLevel.WARN);
        }

        await member.roles.set(updated_roles);
        if (!["646500861505437716"].includes(user.id)) {
            if (level === 5) {
                await user.send("__**Congratulations!**__ :tada:\n\nYou have reached `Level 5` in the Breeding Den Server! You're now able to submit characters and join Voice Channels if you want to!" +
                    "\n\n(_P.S. I'm a bot, so please don't reply!_)");
            } else if (level === 20) {
                await user.send("__**Congratulations!**__ :tada:\n\nYou have reached `Level 20` in the Breeding Den Server! You can now create your own cult, as long as certain criterias are met too!" +
                    "For more detailed information, please check out the very top message in <#538901164897337347>" +
                    "\nIf you're interested, simply ask a Staff member and they will guide you through the process!\n\n(_P.S. I'm a bot, so please don't reply!_)");
            } else if (level === 30) {
                await user.send("__**Congratulations!**__ :tada:\n\nYou have reached `Level 30` in the Breeding Den Server! You're now able to get yourself a __Custom Role__ if you want to!" +
                    "\nSimply ask a Staff member and tell them the __Name__ and __Color__ (ideally in Hexcode) of the Custom role!\n\n(_P.S. I'm a bot, so please don't reply!_)");
            }
        }
        await util.react(message, '✅');
    },

    time: function(time_ms: number) {
        let time = ~~(time_ms / 1000);
        const s = ~~time % 60;
        time /= 60;
        const m = ~~time % 60;
        time /= 60;
        const h = ~~time % 24;
        time /= 24;
        const d = ~~time % 365;
        time /= 365;
        const y = ~~time;
        if (y) {
            return `${y}y ${d}d`;
        }
        if (d) {
            return `${d}d ${h}h`;
        }
        if (h) {
            return `${h}h ${m}m`;
        }
        if (m) {
            return `${m}m ${s}s`;
        }
        return `${s}s`;
    },

    react: async function(message: DiscordJS.Message, emote: string | DiscordJS.GuildEmoji) {
        try {
            await message.react(emote);
        } catch (error) {
            util.log(`Failed reacting with emote ${emote} to [this message](${message.url}) by ${message.author} because ${error}`, "Adding reaction", util.logLevel.ERROR);
        }
    }
};

client.login(localConfig.TOKEN);
