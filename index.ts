let localConfig: any;
try { localConfig = require("./localConfig"); } catch (e) { }

import * as DiscordJS from "discord.js";
const client = new DiscordJS.Client({ partials: ['MESSAGE', 'CHANNEL', 'REACTION'] });
import _ = require("underscore");
import moment = require("moment");
import assert = require('assert');
import schedule = require('node-schedule');

const debug = false;

const MongoClient = require('mongodb').MongoClient;
const db_name = (_.isUndefined(localConfig)) ? process.env.DB_NAME : debug ? localConfig.DB.TESTNAME : localConfig.DB.NAME;
const db_user = (_.isUndefined(localConfig)) ? process.env.DB_USER : localConfig.DB.USER;
const db_pw = (_.isUndefined(localConfig)) ? process.env.DB_PW : localConfig.DB.PW;
const url = `mongodb+srv://${db_user}:${db_pw}@cluster0-c0kzw.mongodb.net/${db_name}?retryWrites=true&w=majority`;

const prefix = _.isUndefined(localConfig) ? process.env.PREFIX : localConfig.PREFIX;
const server_id = _.isUndefined(localConfig) ? process.env.SERVER_ID : localConfig.SERVER;
let server: DiscordJS.Guild;

type Str_to_Channel = {
    [key: string]: string | DiscordJS.TextChannel
}
type Str_to_Role = {
    [key: string]: string | DiscordJS.Role
}
type Str_to_Emoji = {
    [key: string]: string | DiscordJS.GuildEmoji
}
type Str_to_Category = {
    [key: string]: string | DiscordJS.CategoryChannel
}

let channels: Str_to_Channel = {
    'main': "accalia-main",
    'level': "📈level-up-log",
    'logs': "accalia-logs",
    'warnings': "🚨warnings",
    'cult-info': "🗿cult-selection",
    'char-sub': "📃character-submission",
    'char-archive': "📚character-archive",
    'char-index': "📕character-index",
    'reports': "📮reports-and-issues",
    'with-male': "🍆with-male",
    'with-female': "🍑with-female",
    'with-femboy': "🍌with-femboy",
    'with-trans': "🌽with-trans",
    'with-furry': "😺with-furry",
    'with-beast': "🦄with-beast",
    'with-futa-herm': "🥕with-futa-herm",
    'as-male': "🍆as-male",
    'as-female': "🍑as-female",
    'as-femboy': "🍌as-femboy",
    'as-trans': "🌽as-trans",
    'as-furry': "😺as-furry",
    'as-beast': "🦄as-beast",
    'as-futa-herm': "🥕as-futa-herm",
    'type-info': "📌type-info",
    'vanilla': "🍦vanilla",
    'gay': "👬gay",
    'lesbian': "👭lesbian",
    'extreme': "✨extreme",
    'group': "👥group",
    'long-term-plot': "📰long-term-plot",
    'gm-style': "🧙gm-style",
    'real-life': "🤝real-life",
    'contact': "💬contact",
    'playing-as-info': "📌playing-as-info",
    'playing-with-info': "📌playing-with-info",
    'general': "🔞general",
    'nsfw-media': "👅nsfw-media",
    'nsfw-media-discussion': "👄nsfw-media-discussion",
    'nsfw-discussion': "nsfw-discussion",
    'tinkering': "tinkering",
    'authentication-logs': "🎫authentication-logs",
    'paranoia-plaza': "🙈ashs-paranoia-plaza",
    'invites': "⚠invite-log",
    'roles-selection': "🎲roles-selection",
    'reported-rps': "☣reported-rp-ads",
};
let categories: Str_to_Category = {
    'playing-with': "RP Playing With",
    'playing-as': "RP Playing As",
    'by-type': "RP By Type",
};
let roles: Str_to_Role = {
    "No_Ping": "DON'T PING⛔",
    "Newcomer": "Newcomer",
    "CustomRoles": "--Custom Roles--",
    "NSFW": "NSFW",
    "Ask_to_dm": "Ask to DM ⚠️",
    "DMs_closed": "DMs Closed ⛔",
    "cult-leader": "Cult Leader",
};
let emojis: Str_to_Emoji = {
    "bancat": "bancat",
    "pingmad": "pingmad",
    "pingangry": "pingangry",
};
type LFP_Timer = {
    [key: string]: NodeJS.Timeout
}
let lfpTimer: LFP_Timer = {};
let lfpChannels: DiscordJS.TextChannel[] = [];
let AsheN: DiscordJS.User;
let lockdown = false;
let disableMentions = true;
let ping_violation_reaction_emoji = emojis.pingangry;
const level_up_module = "Level roles";
const link_regex = /((https?|ftp):\/\/|www\.)(\w.+\w\W?)/g; //source: https://support.discordapp.com/hc/en-us/community/posts/360036244152-Change-in-text-link-detection-RegEx
let invites: DiscordJS.Collection<string, DiscordJS.Invite>;

const dbMod = {
    'warnUser': function (member: DiscordJS.User, level: number, warner: DiscordJS.GuildMember, reason?: string) {
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
                            `__Reason:__ ${!_.isEmpty(reason) ? reason : 'Not specified'} (Warned by ${warner})\n` +
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
    'checkWarnings': function () {
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
    'connect': function (callback: (db: any) => any) {
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

const startUpMod = {
    'initialize': function (startUpMessage:string) {
        try {
            if (!_.isUndefined(localConfig)) server = localConfig.SERVER;
            server = <DiscordJS.Guild>client.guilds.resolve(server_id);
            _.each(channels, function (channel, channelID) {
                const c = server.channels.cache.find(ch => _.isEqual(ch.name, channels[channelID]));
                if (!c) {
                    console.log(`Error: Failed filling channel ${channels[channelID]} because it was not found`)
                }
                else if (c.type === "text") {
                    channels[channelID] = c as DiscordJS.TextChannel;
                }
                else {
                    console.log(`Error: Failed filling channel ${channels[channelID]} because it's not a text channel`)
                }
            });
            _.each(categories, function (category, categoryID) {
                const c = server.channels.cache.find(ch => _.isEqual(ch.name, categories[categoryID]));
                if (!c) {
                    console.log(`Error: Failed filling channel ${categories[categoryID]} because it was not found`)
                }
                else if (c.type === "category") {
                    categories[categoryID] = c as DiscordJS.CategoryChannel;
                }
                else {
                    console.log(`Error: Failed filling channel ${categories[categoryID]} because it's not a category channel`)
                }
            });
            _.each(Object.keys(util.roles.LVL), role_name => util.roles.LVL[role_name] = <DiscordJS.Role>server.roles.cache.find(role => role.name === <string>util.roles.LVL[role_name]));
            _.each(Object.keys(roles), role_name => roles[role_name] = <DiscordJS.Role>server.roles.cache.find(role => role.name === roles[role_name]));
            _.each(Object.keys(emojis), emojiname => emojis[emojiname] = <DiscordJS.GuildEmoji>server.emojis.cache.find(emoji => emoji.name === emojiname));

            client.users.fetch("528957906972835850") //"105301872818028544"));
            .then(user => AsheN = user);
            if (!client.user) {
                throw "I don't know what's happening";
            }
            client.user.setActivity("Serving the Den").catch(util.reportToAsheN);
            ping_violation_reaction_emoji = emojis[<string>ping_violation_reaction_emoji];

            util.sendTextMessage(channels.main, startUpMessage);
            util.log("INITIALIZED.", "Startup", util.logLevel.INFO);

            fnct.serverStats(['users', 'online', 'new', 'bots', 'roles', 'channels', 'age']);

            lfpChannels.push(<DiscordJS.TextChannel>channels["with-male"]);
            lfpChannels.push(<DiscordJS.TextChannel>channels["with-female"]);
            lfpChannels.push(<DiscordJS.TextChannel>channels["with-femboy"]);
            lfpChannels.push(<DiscordJS.TextChannel>channels["with-trans"]);
            lfpChannels.push(<DiscordJS.TextChannel>channels["with-furry"]);
            lfpChannels.push(<DiscordJS.TextChannel>channels["with-beast"]);
            lfpChannels.push(<DiscordJS.TextChannel>channels["with-futa-herm"]);
            lfpChannels.push(<DiscordJS.TextChannel>channels["as-male"]);
            lfpChannels.push(<DiscordJS.TextChannel>channels["as-female"]);
            lfpChannels.push(<DiscordJS.TextChannel>channels["as-femboy"]);
            lfpChannels.push(<DiscordJS.TextChannel>channels["as-trans"]);
            lfpChannels.push(<DiscordJS.TextChannel>channels["as-furry"]);
            lfpChannels.push(<DiscordJS.TextChannel>channels["as-beast"]);
            lfpChannels.push(<DiscordJS.TextChannel>channels["as-futa-herm"]);
            lfpChannels.push(<DiscordJS.TextChannel>channels["vanilla"]);
            lfpChannels.push(<DiscordJS.TextChannel>channels["gay"]);
            lfpChannels.push(<DiscordJS.TextChannel>channels["lesbian"]);
            lfpChannels.push(<DiscordJS.TextChannel>channels["extreme"]);
            lfpChannels.push(<DiscordJS.TextChannel>channels["group"]);
            lfpChannels.push(<DiscordJS.TextChannel>channels["long-term-plot"]);
            lfpChannels.push(<DiscordJS.TextChannel>channels["gm-style"]);
            lfpChannels.push(<DiscordJS.TextChannel>channels["real-life"]);

            server.fetchInvites()
            .then(invs => invites = invs);

            this.startSchedules();

        } catch (e) {
            if (!_.isUndefined(localConfig)) console.log(`(${moment().format('MMM DD YYYY - HH:mm:ss.SSS')}) Failed to start up.`);
        }
    },
    'startSchedules': function () {
        // Cron-format: second 0-59 optional; minute 0-59; hour 0-23; day of month 1-31; month 1-12; day of week 0-7
        let j = schedule.scheduleJob('*/60 * * * *', function(fireDate){
            cmd.cn();
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

const process_member_join = (member: DiscordJS.GuildMember | DiscordJS.PartialGuildMember, invs: DiscordJS.Collection<string, DiscordJS.Invite>) => {
    const invitee_is_new = new Date().getTime() - (client.users.cache.get(member.id)?.createdTimestamp || 0) < 1000 * 60 * 60 * 24;
    const invitee_str = `${member}` +
        `(${member.user?.username}#${member.user?.discriminator})` +
        `${invitee_is_new ? `(:warning: new account from ${util.time(new Date().getTime() - (member.user?.createdTimestamp || 0))} ago)` : ""}`;
    return invites.reduce((curr, old_invite) => {
        const new_invite = invs.get(old_invite.code);
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
            const inviter_guildmember = old_invite.inviter ? server.members.cache.get(old_invite.inviter.id) : undefined;
            const inviter_has_left = inviter_guildmember === undefined;
            const inviter_is_recent = inviter_guildmember ? (new Date().getTime() - (inviter_guildmember.joinedTimestamp || 0) < 1000 * 60 * 60 * 24) : false;
            const inviter_age = util.time(new Date().getTime() - (inviter_guildmember?.joinedTimestamp || 0));
            const inviter_recent_string = inviter_is_recent ? `(:warning: who joined ${inviter_age} ago) ` : "";
            curr += `${invitee_str} **joined**; Invited by\n` +
                `${old_invite.inviter} ` + `(${old_invite.inviter?.username}#${old_invite.inviter?.discriminator}) ` + inviter_recent_string +
                `${inviter_has_left ? "who already left " : ""}(**${new_uses}** invite(s) on ${expired ? "expired " : ""}code **${old_invite.code}**)\n`;
        }
        if (new_uses > old_uses + 1) {
            curr += `Sorry, I missed ${new_uses - old_uses - 1} join(s) invited by ${old_invite.inviter}, should be people below this message.\n`;
        }
        return curr;
    }, "");
}

client.on("guildMemberAdd", (member) => {
    if (member.guild?.id !== server.id) { //ignore non-main servers
        return;
    }
    const invite_channel = <DiscordJS.TextChannel>channels.invites;
    server.fetchInvites()
    .then(invs => {
        const inv_string = process_member_join(member, invs);
        if (inv_string === "") {
            setTimeout(() => {
                server.fetchInvites()
                .then(invs => {
                    const invitee_str = `${member}(${member.user?.username}#${member.user?.discriminator})`;
                    const inv_string = process_member_join(member, invs) || `I can't figure out how ${invitee_str} joined the server.`;
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
});

client.on("inviteCreate", invite => {
    invites.set(invite.code, invite);
});

client.on("guildMemberRemove", (member) => {
    fnct.serverStats(['users', 'online', 'new']);
});

client.on("guildUpdate", (oldGuild, newGuild) => {
    fnct.serverStats(['users', 'online', 'new', 'bots', 'roles', 'channels', 'age']);
});

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
    if (_.isEqual(reaction, "⭐") || _.isEqual(reaction, "✅")) {
        fnct.approveChar(messagereaction.message, messagereaction.emoji, user);
    }
    if (reaction === "❌") { //Post got flagged
        //check that it's in an LFP channel
        const channel = messagereaction.message.channel;
        if (!(channel instanceof DiscordJS.TextChannel)) return;
        if (!channel.parent) return;
        const playing_with_category = categories['playing-with'];
        if (typeof playing_with_category === "string") return;
        const playing_as_category = categories['playing-as'];
        if (typeof playing_as_category === "string") return;
        const type_category = categories['by-type'];
        if (typeof type_category === "string") return;
        if (!([playing_with_category.id, playing_as_category.id, type_category.id].includes(channel.parent.id))) return;
        //no self-reports
        if (messagereaction.message.author.id === client.user?.id) return;
        //check that we haven't already handled it
        if (messagereaction.me) return;
        //place own reaction
        await messagereaction.message.react("❌");
        //get context
        let playtype = "";
        if (channel.parent.id === playing_with_category.id) playtype = `to play with ${channel.name.substr(7)} characters`;
        else if (channel.parent.id === playing_as_category.id) playtype = `to play as a ${channel.name.substr(5)} character`;
        else playtype = `for ${channel.name === "✨extreme" ? "an extreme" : `a ${channel.name.substr(2)}`} type roleplay`;
        //make report
        util.sendTextMessage(channels["reported-rps"], new DiscordJS.MessageEmbed()
        .setDescription(messagereaction.message.content)
        .addField("Details",
        `Channel: ${channel}\n` +
        `Post author: ${messagereaction.message.author}\n` +
        `Reported by: ${user}\n` +
        `[Link to post](${messagereaction.message.url})`)
        .addField("Founded Report Template",
        `\`\`\`\n<@${messagereaction.message.author.id}> Your ad does not fit in <#${channel.id}> because it doesn't explicitly look ${playtype}.\`\`\`` +
        `${channels["contact"]}`)
        .addField("Unfounded Report Template",
        `\`\`\`\n<@${user.id}> The ad you reported in <#${channel.id}> (<${messagereaction.message.url}>) seems to be on-topic since it's looking ${playtype}. What is wrong with it?\`\`\`` +
        `${channels["contact"]}`)
        );
    }
});

client.on('messageReactionRemove', async (messagereaction, user) => {
    if (user === client.user) return;
    if (!(user instanceof DiscordJS.User)) {
        user = await client.users.fetch(user.id);
    }
    const reaction = messagereaction.emoji.name;
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
    if (typeof channels.tinkering === "string" ||
        typeof channels.general === "string" ||
        typeof channels["nsfw-media"] === "string" ||
        typeof channels["paranoia-plaza"] === "string" ||
        typeof channels["contact"] === "string" ||
        typeof channels["authentication-logs"] === "string" ||
        typeof roles.No_Ping === "string") {
        return;
    }
    if (_.isEqual(message.author.username, client.user.username)) return;
    if (message.author.bot) {
      if (!(
          (_.isEqual(message.author.id, "159985870458322944") && _.isEqual(message.channel.name, "📈level-up-log")) ||
          (_.isEqual(message.author.id, "155149108183695360") && _.isEqual(message.channel.name, "🚨reports-log")) ||
          (_.isEqual(message.author.username, "Carl-bot Logging") && _.isEqual(message.channel.name, "🎫authentication-logs"))
      )) {
          return;
      }
    }
    if (!message.channel.guild) return; // Ignore DMs
    if (message.channel.guild.id !== server.id) return; // Ignore non-main servers
    if (lockdown) return;

    // Prefix as first character -> command
    if (_.isEqual(message.content.indexOf(prefix), 0)) {
        cmd.call(message);
    }

    if (lfpChannels.includes(message.channel)) {
        let number_of_attached_images = message.attachments.filter(embed => !!embed.height).size;
        let violationMode = 0;
        if ((util.image_link_count(message.content) + number_of_attached_images) > 3) { // check for msg which have >3 images in any LFP channel
            violationMode = 1;
        }
        // Check for messages sent in lfp channels
        message.channel.messages.fetch({ "before": message.id, "limit": 100 })
            .then(messages => {
                let time_passed_s = 0;
                type Message_Author_Timestamp = {
                    message: DiscordJS.Message
                    createdTimestamp: number
                };
                let previous_message: Message_Author_Timestamp;
                if (_.isEmpty(messages)) {
                    previous_message = messages.reduce((m1, m2) => {
                        if (!_.isEqual(m1.message.author.id, m2.author.id)) return m1;
                        return m1.createdTimestamp > m2.createdTimestamp ? m1 : {message: m2, createdTimestamp: m2.createdTimestamp};
                    }, { "message": message, "createdTimestamp": 0 });

                    // Previous message sent was less than 24h ago
                    if (previous_message.createdTimestamp !== 0) {
                        time_passed_s = ~~((message.createdTimestamp - previous_message.createdTimestamp) / 1000);
                        if (time_passed_s < 60 * 60 * 24) {
                            previous_message.message.delete()
                                .then(() => util.log(`Deleted previous LFP message from ${message.author} (${message.author.id}) in ${message.channel} from ${util.time(time_passed_s)}.`, 'lfpMsgDelete', util.logLevel.INFO))
                                .catch(() => util.log(`Couldn't delete previous LFP message from ${message.author} (${message.author.id}) in ${message.channel} from ${util.time(time_passed_s)}.`, 'lfpMsgDelete', util.logLevel.WARN));
                        }
                    }
                }
                if (violationMode === 0) {
                    return;
                }

                let warnMsg = `${message.author}, your roleplaying ad in ${message.channel} `;
                let reason = "";
                if (violationMode === 1) { reason = `contains more than 3 images.`; }

                util.sendTextMessage(channels["reported-rps"], new DiscordJS.MessageEmbed()
                .setDescription("RP ad violation: More than 3 images in RP ad.")
                .addField("Details", `Post author: ${message.author}\n[Link to post](${message.url})`));
                message.react('❌')
                    .then() // react success
                    .catch(e => {
                        util.sendTextMessage(channels.main, new DiscordJS.MessageEmbed().setDescription(`HALP, I cannot warn ${message.author} for violating the LFP rules in ${message.channel}! Their ad ${reason}\n` +
                            `[Violating Message Link](${message.url})\n` +
                            `[Previous Message Link](${previous_message.message.url})`));
                    });

                warnMsg += `${reason} \nPlease follow the guidelines as described in ${channels["type-info"]}. Thanks! :heart:`;
                util.sendTextMessage(channels["contact"], warnMsg);
                util.log(`${message.author}'s lfp ad in ${message.channel} ${reason}`, "lfpAdViolation", util.logLevel.INFO);
            })
            .catch(e => {
                util.log('Failed: ' + e.toString(), 'lfpAdViolation', util.logLevel.WARN);
            });
    }

    // delete links in general
    if (_.isEqual(message.channel.id, channels["general"].id)) {
        if (message.content.match(link_regex)) {
            if (util.isStaff(message)) { //have mercy on staff and don't delete messages
                message.react(emojis.bancat).catch(console.error);
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
            util.sendTextMessage(message.channel, `${message.author} Sorry, no media or links of any kind in this channel. Put it in ${channels["nsfw-media"]} or another media channel please.`);
            return;
        }
    }

    // delete links in Hentai Corner and Pornhub categories and nsfw-media
    if (!_.contains(["SOURCE", "NSFW-DISCUSSION", "EXTREME-FETISHES-BOT", "NSFW-BOT-IMAGES"], message.channel.name.toUpperCase()) &&
        !_.isNull(message.channel.parent) && _.contains(["HENTAI CORNER", "PORNHUB"], message.channel.parent?.name.toUpperCase()) ||
        message.channel.id === channels["nsfw-media"].id
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
            message.reply(message.channel.id === channels["nsfw-media"].id ?
            `sorry, no messages without media allowed in this channel. Use ${channels["nsfw-media-discussion"]}.` :
            `sorry, messages without media or links are removed in media channels. Please put it in ${channels["nsfw-discussion"]} instead.`)
                .then(msg => {
                    setTimeout(()=> {
                        msg.delete();
                    }, 7000);
                });
            return;
        }
    }

    //copy new account joins from auth log to paranoia plaza
    if (message.channel.id === channels["authentication-logs"].id) {
        if (!message.embeds) { //Stop chatting in the auth log channel :reeeee:
            return;
        }
        message.embeds.forEach(embed => {
            if ((embed.description?.indexOf("**NEW ACCOUNT**") || 0) > 0) {
                (<DiscordJS.TextChannel>channels["paranoia-plaza"]).send(new DiscordJS.MessageEmbed(embed))
                .catch(console.error);
            }
        });
        return;
    }

    // If not from Mee6 and contains mentions
    if (message.mentions.members?.size && !message.author.bot && message.channel.id !== channels["contact"].id) {
        // react with :pingangry: to users who mention someone with the Don't Ping role
        const dontPingRole = roles.No_Ping;
        const no_ping_mentions = message.mentions.members.filter(member => (member.roles.cache.has(dontPingRole.id) && !_.isEqual(member.user, message.author)));
        if (no_ping_mentions.size !== 0) {
            const no_ping_mentions_string = no_ping_mentions.reduce((prev_member, next_member) => prev_member + `${next_member} `, "");
            const log_message = `${message.author} pinged people with <@&${dontPingRole.id}>:\n${no_ping_mentions_string}\n[Message Link](${message.url})`;
            if (!util.isUserStaff(message.author)) { // exclude staff
                util.log(log_message, "Ping role violation", util.logLevel.INFO);
                message.react(!_.isNull(ping_violation_reaction_emoji) ? ping_violation_reaction_emoji : '🚫')
                    .catch(error => {
                        util.log(`Failed reacting to [this message](${message.url})`, "Ping role violation", util.logLevel.WARN);
                        util.sendTextMessage(channels.main, new DiscordJS.MessageEmbed().setDescription(`HALP, I'm blocked by ${message.author}!\n` +
                            `They pinged people with the <@&${dontPingRole.id}> role!\n[Message Link](${message.url})`));
                    });
            }
        }
    }

    if (_.isEqual(message.channel.name, "📈level-up-log")) {
        util.handle_level_up(message);
    }

    if (message.mentions.members?.has(client.user.id)) {
        const args = message.content.trim().split(/ +/g).splice(1);
        util.log(message.content, `mentioned by (${message.author})`, util.logLevel.INFO);

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
                    util.sendTextMessage(message.channel, `${message.author}, please be patient, the help page is under construction KAPPACINNOOOO...`);
                    break;
                }
                default: {
                    util.sendTextMessage(message.channel, `dafuk is this MATE?!`);
                    break;
                }
            }
        } // _.isEqual(message.author.id, "159985870458322944") &&
    }
    if (_.isEqual(message.channel.name, "🚨reports-log")) {
        const was_mute = message.embeds[0].author?.name?.indexOf('Mute');
        if (was_mute) {
            const usr = message.embeds[0].fields[0].value;
            const usrid = usr.match(/([0-9])+/g)?.[0];
            if (!usrid) {
                return;
            }
            const userM = message.guild?.members.cache.get(usrid);
            if (userM && userM.roles.cache.find(role => _.isEqual(role.name, util.roles.NEW))) {
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
    if (_.contains(lfpChannels, message.channel)) {
        const channel = message.channel;
        if (!_.isUndefined(lfpTimer[channel.name])) {
            clearTimeout(lfpTimer[channel.name]);
        }
        lfpTimer[channel.name] = setTimeout(() => {
            channel.messages.fetch()
            .then(messages => {
                let msg = messages.filter(m => _.isEqual(m.author.id, client.user?.id));
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
                    target = "Males, people with the \"Male\" role (not Femboys)";
                    break;
                case "with-female":
                    title = "FEMALE Characters";
                    target = "Females, Tomboys, etc.";
                    break;
                case "with-femboy":
                    title = "FEMBOY Characters";
                    target = "People with the \"Trap/Femboy\" role";
                    break;
                case "with-trans":
                    title = "TRANS Characters";
                    target = "People with the MtF or FtM roles";
                    break;
                case "with-furry":
                    title = "FURRY Characters";
                    target = "Furries and Anthromorphs (not beasts/bestiality rp)";
                    break;
                case "with-beast":
                    title = "BEAST Characters";
                    target = "People playing Beasts who are interested in Bestiality RP (not furries)";
                    break;
                case "with-futa-herm":
                    title = "FUTANARI / HERMAPHRODITE Characters";
                    target = "Futanari and Hermaphrodites (not trans)";
                    break;

                //RP Playing As
                case "as-male":
                    title = "MALE Characters";
                    target = "Males and people with the \"Male\" role (not Femboys)";
                    break;
                case "as-female":
                    title = "FEMALE Characters";
                    target = "Females, Tomboys, etc.";
                    break;
                case "as-femboy":
                    title = "FEMBOY Characters";
                    target = "People with the \"Trap/Femboy\" role";
                    break;
                case "as-trans":
                    title = "TRANS Characters";
                    target = "People who want to play as gender-transitioned characters or make gender-bending a major theme in the RP.";
                    break;
                case "as-furry":
                    title = "FURRY Characters";
                    target = "Furries and Anthromorphs (not beasts/bestiality rp)";
                    break;
                case "as-beast":
                    title = "BEAST Characters";
                    target = "Beasts and people interested in Bestiality RP (not furries)";
                    break;
                case "as-futa-herm":
                    title = "FUTANARI / HERMAPHRODITE Characters";
                    target = "Futanari and Hermaphrodites (not trans)";
                    break;

                //RP By Type
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
                case "xtreme": //the unicode symbol for extreme is 1 byte long instead of 2, so the e gets removed along with the symbol
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
                default:
                    util.log(`Failed finding matchmaking channel ${channel.name.substr(2)}`, "Matchmaking", util.logLevel.ERROR);
                }

            const playing_as_category = categories["playing-as"];
            const playing_with_category = categories["playing-with"];
            const by_type_category = categories["by-type"];
            if (typeof playing_as_category === "string") return;
            if (typeof playing_with_category === "string") return;
            if (typeof by_type_category === "string") return;
            const playing_as = channel.parent?.id === playing_as_category.id;
            const playing_with = channel.parent?.id === playing_with_category.id;
            const by_type = channel.parent?.id === by_type_category.id;
            const info_channel =
            playing_as ? `${channels["playing-as-info"]}` :
            playing_with ? `${channels["playing-with-info"]}` :
            by_type ? `${channels["type-info"]}` :
            ``;
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
            if (typeof channels["extreme"] === "string") return;
            if (typeof channels["real-life"] === "string") return;
            const exclusive = [channels["extreme"].id, channels["real-life"].id].indexOf(message.channel.id) !== -1 ? "⚠️ __**If your ad is on-topic in this channel do not post it in other channels!**__\n\n" : "";
            if (!(message.channel instanceof DiscordJS.TextChannel)) return;
            const lfpMsg =
                `>>> __**${rp_type_str} ${title} Channel Info**__\n` +
                `🔹 __What posts are to be expected and to be posted in this channel?__\n` +
                `LFP ads which explicitly state that they **${rp_with_as_looking_for} ${title}**.\n\n` +
                `🔹 __Target Audience for LFP posts:__\n` +
                `**${playing_as ? "Anyone wanting to play with " : ""}${target}**\n\n` +
                `${exclusive}` +
                `If you see posts which are __not clearly looking for these kinds of RP__ in this channel let the staff know by reacting with :x: (\`:x:\`) or reporting it in ${channels.reports}!\n\n` +
                `If you want to **contact** someone who posted in this channel, **please check their DM Roles** first! If they have **Ask to DM ⚠️** or **DMs Closed ⛔** use ${channels["contact"]}!\n\n` +
                `*More info in:* ${info_channel}\n\n`
            ;

            channel.send(lfpMsg)
            .catch(error => util.log(`Failed updating lfp info in ${channel} because ${error}`, "lfpInfo", util.logLevel.ERROR));
        }, 2000);
    }
});

const get_permission_diff_string = (old_permissions: number, new_permissions: number) => {
    let added = "";
    let removed = "";
    const permissions = [
        DiscordJS.Permissions.FLAGS.ADMINISTRATOR,
        DiscordJS.Permissions.FLAGS.CREATE_INSTANT_INVITE,
        DiscordJS.Permissions.FLAGS.KICK_MEMBERS,
        DiscordJS.Permissions.FLAGS.BAN_MEMBERS,
        DiscordJS.Permissions.FLAGS.MANAGE_CHANNELS,
        DiscordJS.Permissions.FLAGS.MANAGE_GUILD,
        DiscordJS.Permissions.FLAGS.ADD_REACTIONS,
        DiscordJS.Permissions.FLAGS.VIEW_AUDIT_LOG,
        DiscordJS.Permissions.FLAGS.PRIORITY_SPEAKER,
        DiscordJS.Permissions.FLAGS.STREAM,
        DiscordJS.Permissions.FLAGS.VIEW_CHANNEL,
        DiscordJS.Permissions.FLAGS.SEND_MESSAGES,
        DiscordJS.Permissions.FLAGS.SEND_TTS_MESSAGES,
        DiscordJS.Permissions.FLAGS.MANAGE_MESSAGES,
        DiscordJS.Permissions.FLAGS.EMBED_LINKS,
        DiscordJS.Permissions.FLAGS.ATTACH_FILES,
        DiscordJS.Permissions.FLAGS.READ_MESSAGE_HISTORY,
        DiscordJS.Permissions.FLAGS.MENTION_EVERYONE,
        DiscordJS.Permissions.FLAGS.USE_EXTERNAL_EMOJIS,
        DiscordJS.Permissions.FLAGS.VIEW_GUILD_INSIGHTS,
        DiscordJS.Permissions.FLAGS.CONNECT,
        DiscordJS.Permissions.FLAGS.SPEAK,
        DiscordJS.Permissions.FLAGS.MUTE_MEMBERS,
        DiscordJS.Permissions.FLAGS.DEAFEN_MEMBERS,
        DiscordJS.Permissions.FLAGS.MOVE_MEMBERS,
        DiscordJS.Permissions.FLAGS.USE_VAD,
        DiscordJS.Permissions.FLAGS.CHANGE_NICKNAME,
        DiscordJS.Permissions.FLAGS.MANAGE_NICKNAMES,
        DiscordJS.Permissions.FLAGS.MANAGE_ROLES,
        DiscordJS.Permissions.FLAGS.MANAGE_WEBHOOKS,
        DiscordJS.Permissions.FLAGS.MANAGE_EMOJIS,
    ];
    const permissions_strings = [
        "Administrator",
        "Create Instant Invite",
        "Kick Members",
        "Ban Members",
        "Manage Channels",
        "Manage Server",
        "Add Reactions",
        "View Audit Log",
        "Priority Speaker",
        "Stream",
        "View Channels",
        "Send Messages",
        "Send Text To Speech Messages",
        "Manage Messages",
        "Embed Links",
        "Attach Files",
        "Read Message History",
        "Use External Emojis",
        "View Guild Insights",
        "External Emojis",
        "Connect To VC",
        "Speak In VC",
        "Mute Members in VC",
        "Deafen Members in VC",
        "Move Members in VC",
        "Use VAD",
        "Chane Nickname",
        "Manage Nicknames",
        "Manage Roles",
        "Manage Webhooks",
        "Manage Emojis",
    ];
    _.forEach(permissions, (permission, index) => {
        if ((old_permissions & permission) !== 0 && (new_permissions & permission) === 0) {
            removed += permissions_strings[index] + ", ";
        }
        if ((old_permissions & permission) === 0 && (new_permissions & permission) !== 0) {
            added += permissions_strings[index] + ", ";
        }
    });
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
        if (audit.target?.id != snowflake) { //not an entry where something was done to the target
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

const audit_send_result = (target_string: string, string: string, channel: DiscordJS.TextChannel | DiscordJS.DMChannel | DiscordJS.NewsChannel) => {
    const result_string = `**Audit for ${target_string}**:\n` + string;
    let message_pieces = DiscordJS.Util.splitMessage(result_string);
    if (!Array.isArray(message_pieces)) {
        message_pieces = [message_pieces];
    }
    _.forEach(message_pieces, message_piece => {
        channel.send(new DiscordJS.MessageEmbed().setDescription(message_piece));
    });
};

const audit_log_search = (target_string: string, message: DiscordJS.Message, snowflake: DiscordJS.Snowflake, result_string = "", latest_entry?: string, counter = 0) => {
    const counter_limit = 50; //How many sets of 100 audit logs will be requested from Discord. Increasing the number usually gives more results and also makes it slower.
    const character_limit = 1500; //How long the result message must be before we consider it enough to avoid the command to be too spammy. The limit can be raised past 2000 in which case multiple messages will be posted.
    if (counter === 0) {
        message.channel.startTyping();
    }
    server.fetchAuditLogs(latest_entry ? {limit: 100, before: latest_entry} : {limit: 100})
    .then(audits => {
        result_string = audits_to_string(audits, snowflake) + result_string;

        if (result_string.length > character_limit || audits.entries.size < 100 || counter > counter_limit) {
            audit_send_result(target_string, result_string, message.channel);
            message.channel.stopTyping();
        }
        else {
            audit_log_search(target_string, message, snowflake, result_string, audits.entries.lastKey(), counter + 1);
        }
    }).catch(error => {
        message.channel.send(new DiscordJS.MessageEmbed()
        .setDescription(`Results so far for ${target_string}:\n${result_string}`)
        .setAuthor(`Failed fetching more audits because ${error}`));
        message.channel.stopTyping();
    });
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
    [key: string]: (arg1?: DiscordJS.Message, arg2?: string[]) => void
};
const cmd: Cmd = {
    'ping': async function (message) {
        if (!message) {
            return;
        }
        try {
            const m = await message.channel.send("Ping!");
            m.edit(`Pong! Latency is ${m.createdTimestamp - message.createdTimestamp}ms. API Latency is ${Math.round(client.ws.ping)}ms`);
            util.log('used command: ping', "ping", util.logLevel.INFO);
        } catch (e) {
            util.log('Failed to process command (ping)', 'ping', util.logLevel.ERROR);
        }
    },
    'staff': async function (message) {
        if (!message) {
            return;
        }
        try {
            const m = await message.channel.send("Checking!");
            let isStaff = util.isStaff(message);
            m.edit(`${message.author} is${(!isStaff) ? ' not' : '' } a staff member!`);
            util.log('used command: staff', "staff", util.logLevel.INFO);
        } catch (e) {
            util.log('Failed to process command (staff)', 'staff', util.logLevel.ERROR);
        }
    },
    'warn': async function (message, args) {
        if (!message) {
            return;
        }
        try {
            if (!util.isStaff(message)) {
                util.sendTextMessage(message.channel, `${message.author} Shoo! You don't have the permissions for that!`);
                return;
            }
            if (!args) {
                console.error("Somehow we got a warn call without args.");
                return;
            }
            let member = message.mentions.members?.first() || message.guild?.members.cache.get(args[0]);
            if (!member)
                return util.sendTextMessage(message.channel, `Please mention a valid member of this server! REEEEEEE`);
            if (member.roles.cache.find(role => _.isEqual(role.name, 'Staff')))
                return util.sendTextMessage(message.channel, `I cannot warn ${member.user.username}... :thinking:`);
            if (!server.roles.cache.find(role => _.isEqual(role.name, util.roles.WARN_1)))
                return util.sendTextMessage(message.channel, `I can't find the role for '${util.roles.WARN_1}' ... :thinking:`);
            if (!server.roles.cache.find(role => _.isEqual(role.name, util.roles.WARN_2)))
                return util.sendTextMessage(message.channel, `I can't find the role for '${util.roles.WARN_2}' ... :thinking:`);

            let innocentRole = server.roles.cache.find(role => _.isEqual(role.name, util.roles.INNOCENT));
            let warnRole1 = server.roles.cache.find(role => _.isEqual(role.name, util.roles.WARN_1));
            let warnRole2 = server.roles.cache.find(role => _.isEqual(role.name, util.roles.WARN_2));
            let hasWarn1 = member.roles.cache.find(role => _.isEqual(role.name, util.roles.WARN_1));
            let hasWarn2 = member.roles.cache.find(role => _.isEqual(role.name, util.roles.WARN_2));
            let level = 0;
            let reason = message.content.substring(message.content.indexOf(args[0]) + args[0].length + 1);
            let err = false;

            if (!warnRole1 || !warnRole2) {
                console.log("Error in warnings: Warning roles are not defined!");
                return;
            }

            // Warn functionality
            if (hasWarn2) {
                level = 3;
            } else if (hasWarn1) {
                await member.roles.add(warnRole2)
                    .then(() => {
                        if (!member || !warnRole1) {
                            console.log("Error in warnings: Member or warning roles are not defined!");
                            return;
                        }
                        member.roles.remove(warnRole1)
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
                await member.roles.add(warnRole1)
                    .then(() => {
                        if (!member || !innocentRole) {
                            console.log("Error in warnings: Member or warning roles are not defined!");
                            return;
                        }
                        member.roles.remove(innocentRole)
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
    'stopmention': function (message) {
        if (!message) {
            return;
        }
        if (util.isStaff(message)) {
            disableMentions = true;
            util.sendTextMessage(message.channel, 'No longer listening to non-staff mentions... :(');
            util.log('Disabling responses to non-staff mentions ...', 'disable mentions', util.logLevel.INFO);
        }
    },
    'startmention': function (message) {
        if (!message) {
            return;
        }
        if (util.isStaff(message)) {
            disableMentions = false;
            util.sendTextMessage(message.channel, 'Start listening to non-staff mentions... :3');
            util.log('Enabling responses to non-staff mentions', 'enable mentions', util.logLevel.INFO);
        }
    },
    'quit': function (message) {
        if (!message) {
            return;
        }
        if (message.author === AsheN) {
            lockdown = true;
            util.log('Locking down...', 'quit', util.logLevel.FATAL);
        }
    },
    'cn': function (message) {
        if (message && !util.isStaff(message)) {
            return;
        }
        let successCount = 0;
        let kickCount = 0;
        let errorCount = 0;
        const newcomerRole = server.roles.cache.find(role => role.name === "Newcomer");
        if (!newcomerRole) {
            util.log(`Failed finding newcomer role`, "Clear Newcomers", util.logLevel.ERROR);
            if (message) {
                util.sendTextMessage(message.channel, `Failed finding newcomer role`);
            }
            return;
        }
        const newcomerMembers = newcomerRole.members.map(m => m.user);
        const channel = message ? message.channel : channels.main;
        if (typeof channel === "string") {
            console.log("Fucking channels are strings and not channels :reeee:");
            return;
        }
        _.each(newcomerMembers, (member, index) => {
            try {
                if ((new Date().getTime() - (server.member(member)?.joinedAt?.getTime() || 0))/1000/60 <= 10) { // joined less than 10 minutes ago
                    return;
                }
                util.log(`Clearing newcomer role from: <@${member.id}> (${index+1} / ${newcomerMembers.length})`, "clearNewcomer", util.logLevel.INFO);
                server.member(member)?.roles.remove(newcomerRole)
                    .then((guildMember) => {
                        if (_.isNull(guildMember.roles.cache.find(role => role.name === "NSFW")) && ((new Date().getTime() - (guildMember.joinedAt?.getTime() || 0))/1000/60 > 10)) { // joined more than 10 minutes ago
                            const reason = guildMember + " kicked from not having NSFW role for a longer period of time.";
                            guildMember.kick(reason)
                                .then(() => util.log(reason, 'clearNewcomer', util.logLevel.INFO))
                                .catch(() => util.log("Failed to kick inactive member: " + guildMember, 'clearNewcomer', util.logLevel.WARN));
                            kickCount++;
                        } else {
                            successCount++;
                        }
                        if (index+1 === newcomerMembers.length) {
                            const logText = successCount + '/' + (successCount + errorCount) + " users cleared of Newcomer role. " + kickCount + " users kicked from not having the NSFW role until now.";
                            util.log(logText, 'clearNewcomer', util.logLevel.INFO);
                            util.sendTextMessage(channels.main, logText);
                        }
                    });
            } catch (e) {
                errorCount++;
                util.log("Couldn't remove Newcomer from: " + member + "\n" + e, 'clearNewcomer', util.logLevel.ERROR);
                if (index+1 === newcomerMembers.length) {
                    const logText = successCount + '/' + (successCount + errorCount) + " users cleared of Newcomer role. " + kickCount + " users kicked from not having the NSFW role until now.";
                    util.log(logText, 'clearNewcomer', util.logLevel.INFO);
                    channel.send(logText);
                }
            }
        });
        if (newcomerMembers.length === 0) {
            channel.send("0" + " Newcomers found.");
        }
    },
    'ancient': function(message) {
        return;
        if (!message) {
            return;
        }
        if (util.isStaff(message!)) {
            const ancientrole = server.roles.cache.find(role => _.isEqual(role.name, util.roles.ANCIENT));
            if (!ancientrole) {
                console.error(`Ancient role not found!`);
                return;
            }
            let ancientTimeThreshold = new Date(server.createdTimestamp + (new Date().getTime() - server.createdTimestamp) / 5);
            util.sendTextMessage(message!.channel, `Threshold for "Ancient Member" is at: ${ancientTimeThreshold.toString()}`);

            let ancientMembers = server.members.cache.filter(m => {
                return ((m.joinedTimestamp || 0) <= ancientTimeThreshold.getTime()) && (!m.user.bot) && _.isNull(m.roles.cache.find(r => _.isEqual(r.name, util.roles.ANCIENT)));
            });

            ancientMembers.forEach(member => {
                member.roles.add(ancientrole!).then();
                console.log(member.user.username + ", last message: " + (member.lastMessage?.createdAt || " too old"));
            });
        } else {
            util.sendTextMessage(message!.channel, "Shoo! You don't have permissions for that!");
        }
    },
    'clear': function(message, args) {
        if (!message) {
            return;
        }
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
    'age': function (message) {
        if (!message) {
            return;
        }
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
            const member_age = member ? member.joinedAt : null;
            if (member_age) { //add member fields Joined, Member Since and Eligible
                const ancientTimeThreshold = new Date(server.createdTimestamp + (new Date().getTime() - server.createdTimestamp) / 5);
                const ancient_date = new Date(server.createdTimestamp + (member_age.getTime() - server.createdTimestamp) * 5);
                const ancient_string = member_age.getTime() < ancientTimeThreshold.getTime() ? "Yes" : `on ${ancient_date.toUTCString()} in ${util.time(ancient_date.getTime() - new Date().getTime())}`;
                embed.addField("Joined", `${member_age.toUTCString()}`);
                embed.addField("Member Since", `${util.time(new Date().getTime() - member_age.getTime())}`);
                embed.addField(`Eligible For **${util.roles.ANCIENT}**`, `${ancient_string}`);
            }
            util.sendTextMessage(message.channel, embed);
        });
    },
    'pfp': function (message) { //display profile picture of a user
        if (!message) {
            return;
        }
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
    'audit': function (message) {
        if (!message) {
            return;
        }
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
    'slowmode': async function (message) {
        if (!message) return;
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
    'sm': function (message) {
        cmd.slowmode(message);
    },
    'cultinfo': function (message) {
        if (!message) {
            return;
        }
        if (typeof channels["cult-info"] === "string") {
            util.sendTextMessage(message.channel, "Error: cultinfo channel could not be resolved");
            return;
        }
        message.channel.startTyping();
        channels["cult-info"].messages.fetch({ limit: 1 })
            .then(messages => {
                let cultMsg = messages.first();
                if (cultMsg && cultMsg.mentions.roles) {
                    const embed = new DiscordJS.MessageEmbed()
                        .setAuthor(`Cult Info`)
                        .setTimestamp(new Date());
                    let description = "";
                    let cultsString = cultMsg.content.split("\n\n");
                    class Cult {
                        iconId: DiscordJS.Snowflake;
                        roleId: DiscordJS.Snowflake;
                        leaderId: DiscordJS.Snowflake;
                        memberCount: number;
                        constructor(iconId: DiscordJS.Snowflake, roleId: DiscordJS.Snowflake, leaderId: DiscordJS.Snowflake, memberCount: number) {
                            this.iconId = iconId;
                            this.roleId = roleId;
                            this.leaderId = leaderId;
                            this.memberCount = memberCount;
                        }
                    };
                    let cults: Cult[] = [];
                    cultsString.forEach(cult => {
                        if (!cult.match("<@&[0-9]*>")) return;
                        const roleId = cult.match("<@&[0-9]*>")?.[0].slice(3, -1);
                        if (!roleId) return;
                        const iconId = cult.slice(0,2) === "<:" ? cult.match("<:[a-zA-Z_0-9]*:[0-9]*>")?.[0] : cult.slice(0,2);
                        if (!iconId) return;
                        const leaderId = cult.match("<@!?[0-9]*>")?.[0].match("[0-9]+")?.[0];
                        if (!leaderId) return;
                        const memberCount = server.roles.cache.get(roleId)?.members.map(m => m.user.tag).length;
                        if (memberCount === undefined) return;
                        cults.push({
                            iconId: iconId,
                            roleId: roleId,
                            leaderId: leaderId,
                            memberCount: memberCount
                        });
                    });

                    cults = cults.sort((a,b) => b.memberCount - a.memberCount);
                    cults.forEach(cult => {
                        description +=
                            `${cult.iconId} <@&${cult.roleId}>\n`
                            + `Leader: <@!${cult.leaderId}>\n`
                            + `**${cult.memberCount}** members\n\n`
                        ;
                    });

                    embed.setDescription(description);

                    message.channel.send(embed)
                        .then(() => message.channel.stopTyping())
                        .catch(err => util.log(err, 'cultInfo', util.logLevel.ERROR));
                }
            })
            .catch(err => {
                util.log(err, 'cultInfo', util.logLevel.ERROR);
                message.channel.stopTyping();
            });
    },
    'checkwarn': function (message) {

    },
    'cw': function (message) {
        cmd.checkwarn(message);
    },
    'roles': function (message, args) {
        if (!message) {
            return;
        }
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
    'roles usage': function (message, args) { //list all the roles and their usage; args can only be "list"
        if (!message) {
            return;
        }
        let sortOrder = "";
        if (args && _.isEqual(args[0], "list")) {
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
    'roles who': function (message) { //list the members who have a certain role
        if (!message) {
            return;
        }
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
    'roles purge': async function (message) {
        if (!message) return;
        if (message.author.id !== "591241625737494538") return;
        const matches = message.content.match(/(?:\d){18}/g);
        if (!matches) return;
        const cultleader = roles["cult-leader"];
        if (typeof cultleader === "string") {
            util.log("Failed finding cult leader role", "Cult cleanup", util.logLevel.ERROR);
            return;
        }
        for (const index in matches) {
            let counter = 0;
            const match = matches[index];
            const role = server.roles.cache.get(match);
            if (!role) {
                util.sendTextMessage(message.channel, `Failed finding role with ID ${match}.`);
                continue;
            }
            for (const [, member] of server.members.cache) {
                if (member.roles.cache.has(match) && !member.roles.cache.has(cultleader.id)) {
                    await member.roles.remove(match);
                    counter++;
                }
            }
            util.sendTextMessage(message.channel, new DiscordJS.MessageEmbed().setDescription(`Removed <@&${match}> from ${counter} members.`));
        }
    },
    'call': async function (message) {
        if (!message) {
            return;
        }
        const args = message.content.slice(prefix.length).trim().split(/ +/g);
        const command = args.shift()?.toLowerCase() || "";
        try {
            if (_.isEqual(command, "call")) return;
            if (_.isUndefined(this[command])) return;
            if (command in this) {
                this[command](message, args);
                util.log(`${message.author} is calling command: \`${message.content}\``, command, util.logLevel.INFO);
            }
        } catch (e) {
            util.log(`Failed to process (${command})`, command, util.logLevel.ERROR);
        }
    },
    'stop typing': function (message) {
        message?.channel.stopTyping(true);
    },
    'raid': async function(message) {
        if (message && !util.isStaff(message)) {
            util.sendTextMessage(message.channel, `Call the mods!`);
            return;
        }
        if (typeof roles.NSFW === "string") {
            util.log(`Failed resolving NSFW role`, "Raid", util.logLevel.ERROR);
            return;
        }
        await roles.NSFW.setPermissions(roles.NSFW.permissions.bitfield & ~DiscordJS.Permissions.FLAGS.CREATE_INSTANT_INVITE, "Raid");
        server.fetchInvites()
        .then(invs => {
            invs.forEach(inv => {
                inv.delete("Raid");
            });
        });
        message?.react('✅');
        util.log(`Disabled invite creation and deleted invites`, "Raid", util.logLevel.WARN);
    },
    'trim_reacts': async function (commandmessage) {
        if (!commandmessage) return;
        const roles_selection = channels["roles-selection"];
        if (typeof roles_selection === "string") return;
        const messages = await roles_selection.messages.fetch();
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
        commandmessage.react("✅");
    },
    'ca': async function (message) {
        return this.chararchive(message);
    },
    'chararchive': async function (message) {
        if (!message) {
            return;
        }
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
    'banish': function (message) { //banish ID|Mention Channel|ChannelID|CategoryID|"Prefix"+
        if (!message) {
            return;
        }
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
    'help': function (message) {
        if (!message) {
            return;
        }
        util.sendTextMessage(message.channel, new DiscordJS.MessageEmbed().setDescription(`I understand the following commands. *Italic* commands are staff-only.

**\`_ping\`**
Show practical reaction delay and Discord delay.

**\`_staff\`**
Checks if you are staff.

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

**\`_age\`** \`[@user|#channel|emoji|ID]*\`
Display the age of an ID. If the ID is of a member of the server also display when they joined and will be eligible for the ancient role. If you don't specify an ID it displays your own info.

**\`_pfp\`** \`[@user|userID]*\`
Display the profile picture of a user in big.

***\`_audit\`*** \`[mention|ID]*\`
Go through the last 10000 audit entries and display all entries (up to message limit) that contain moderator action of the given target. This command tends to take ~10-20 seconds, please be patient.

***\`_slowmode\`*** | ***\`_sm\`*** \`[#channel|channelID|categoryID]* [number][h|m|s]*\`
Sets slowmode to the channel. Example: \`_slowmode #🔞general 30s 2m\`. The time is optional and defaults to 0. The maximum time is 6 hours. Use this command if you need to set a slowmode that is not supported by the UI such as 4 hours.

**\`_cultinfo\`**
Displays a list of the current cults and their symbol, cult role, leader and number of members sorted by members.

***\`_roles usage\`***
Displays a list of all roles and the number of their uses sorted by use-count.

***\`_roles usage list\`***
Displays a list of all roles and the number of their uses sorted by name.

***\`_roles who\`*** \`[@role|roleID]*\`
Displays a list of members who have the specified role(s).

***\`_chararchive\`*** | ***\`_ca\`*** \`[messageID]?\`
Displays a list of links to <#534863007860129792> messages that contain a mention of a user that is not a member. The character archive is searched starting the specified messageID or the latest message. Displays the oldest messageID searched for to continue searching.

***\`_banish\`*** \`[userID] [channelID]* [categoryID]* ["prefix"]*\`
Hides the given channels from the given user. The channels can be specified directly, by specifying a category or using a prefix. For example \`_banish 315977186383364096 (user ID) ":wine_glass:" (Cult prefix)\` hides the Debaucherous Bastards cult from that user. \`_banish 315977186383364096 (user ID) 616685364186316820 (fun corner ID)\` hides the Fun Corner from the user.

**\`_help\`**
Display this text.`))
    },
};

const fnct = {
    'serverStats': function (modes: string[]) {
        try {
            _.forEach(modes, mode => {
                let channel = "";
                let str = "";
                switch (mode) {
                    case 'users':
                        channel = "582321301142896652";
                        str = "📊User Count: " + server.members.cache.filter(member => !member.user.bot).size;
                        break;
                    case 'online':
                        channel = "582321302837133313";
                        str = "📊Online users: " + server.members.cache.filter(member => !member.user.bot && !_.isEqual(member.user.presence.status, "offline")).size;
                        break;
                    case 'new':
                        channel = "582309343274205209";
                        str = "📈New users: " + server.members.cache.filter(member => !member.user.bot && ((new Date().getTime() - (member.joinedTimestamp || 0)) / 1000 / 60 / 60 / 24) <= 1).size;
                        break;
                    case 'bots':
                        channel = "582309344608124941";
                        str = "🤖Bot Count: " + server.members.cache.filter(member => member.user.bot).size;
                        break;
                    case 'roles':
                        channel = "606773795142893568";
                        str = "🎲Roles: " + server.roles.cache.size;
                        break;
                    case 'channels':
                        channel = "606773807306506240";
                        str = "📇Channels: " + server.channels.cache.size;
                        break;
                    case 'age':
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
        util.log('Successfully updated server stats! (' + modes + ')', 'Server Stats', util.logLevel.INFO);
    },
    'approveChar': function(message: DiscordJS.Message, reaction: DiscordJS.ReactionEmoji, user: DiscordJS.User) {
        try {
            if (!(message.channel instanceof DiscordJS.TextChannel)) return;
            if (typeof channels["char-sub"] === "string") return;
            if (typeof channels["char-archive"] === "string") return;
            if (_.isEqual(message.channel.name, channels["char-sub"].name) && util.isUserStaff(user)) {
                let msgType = _.isEqual(reaction.name, "⭐") ? 1 : _.isEqual(reaction.name, "✅") ? 2 : 0;
                if (msgType === 0) {
                    return;
                }
                let msgAttachments = message.attachments.map(a => a.url);
                let msgImagesString = "";
                _.each(msgAttachments, imgUrl => msgImagesString += imgUrl + "\n");
                util.log(`${user} approved character message:\n ${message.content}\n ${msgImagesString}`, "approveCharacter", util.logLevel.INFO);
                let msgContent = `User: ${message.author}\n${message.content}`;
                channels["char-archive"].send(msgType === 1 ? msgContent : message.content, { files: msgAttachments })
                    .then(msg => {
                        if (typeof channels["char-index"] === "string") return;
                        if (msgType === 1) {
                            channels["char-index"].send(`\`${message.author} Your character has been approved and can be found in the index under \"\".\``);
                        }
                        let msgImages = msg.attachments.map(a => a.url);
                        let msgImagesString = "";
                        _.each(msgImages, imgUrl => msgImagesString += imgUrl + "\n");
                        channels["char-index"].send(`\`r!addchar \"charName\"\n\``);
                        channels["char-index"].send(`\`${message.content}\``);
                        channels["char-index"].send(`${msgImagesString}`);
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
    'sendTextMessage': function (channel: DiscordJS.TextChannel | DiscordJS.DMChannel | DiscordJS.NewsChannel | string, message: DiscordJS.MessageEmbed | string) {
        if (!channel || typeof channel === "string") return;
        try {
            channel.startTyping();
            const message_pieces = split_text_message(typeof message === "string" ? message : message.description || "");
            setTimeout(function(){
                _.forEach(message_pieces, message_piece => {
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
    'sendTempTextMessage': function (channel: DiscordJS.TextChannel | DiscordJS.DMChannel | DiscordJS.NewsChannel, message: string, embed?: DiscordJS.MessageEmbed) {
        try {
            if (!channel) {
                return;
            }
            channel.startTyping();
            const message_pieces = split_text_message(message);
            setTimeout(function(){
                _.forEach(message_pieces, message_piece => {
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
    'isStaff': function (message: DiscordJS.Message) {
        return message.author.lastMessage?.member?.roles.cache.find(role => _.isEqual(role.name, this.roles.STAFF) || _.isEqual(role.name, this.roles.TRIALMOD)) || message.author === AsheN;
    },

    'isUserStaff': function (user: DiscordJS.User) {
        const staffRole = server.roles.cache.find(role => role.name === util.roles.STAFF);
        const trialModRole = server.roles.cache.find(role => role.name === util.roles.TRIALMOD);
        let isStaff = false;
        if (staffRole && staffRole.id) {
            isStaff = (server.roles.cache.get(staffRole.id)?.members.map(m => m.user).filter(staffMember => _.isEqual(staffMember, user)).length || 0) > 0;
        }
        if (!isStaff && trialModRole && trialModRole.id) {
            isStaff = (server.roles.cache.get(trialModRole.id)?.members.map(m => m.user).filter(staffMember => _.isEqual(staffMember, user)).length || 0) > 0;
        }
        return isStaff;
    },

    'roles': {
        'DONTPING': "DONT PING⛔",
        'STAFF': "Staff",
        'TRIALMOD': "Trial-Moderator",
        'ANCIENT': "💠Ancient Member",
        'NEW': "Newcomer",
        'NSFW': "NSFW",
        'MUTED': "Muted",
        'INNOCENT': "Innocent",
        'WARN_1': "Warned 1x",
        'WARN_2': "Warned 2x",
        'LVL': <Str_to_Role>{
            'LVL_0': "Lewd (Lvl 0+)",
            'LVL_5': "Pervert (Lvl 5+)",
            'LVL_10': "Tainted (Lvl 10+)",
            'LVL_20': "Slut (Lvl 20+)",
            'LVL_30': "Whore (Lvl 30+)",
            'LVL_40': "Cumdump (Lvl 40+)",
            'LVL_50': "Pornstar (Lvl 50+)",
            'LVL_60': "Sex-Toy (Lvl 60+)",
            'LVL_70': "Server Bus (Lvl 70+)",
            'LVL_80': "Doesn't leave bed (Lvl 80+)",
            'LVL_90': "Sperm Bank (Lvl 90+)",
            'LVL_100': "Retired Pornstar (Lvl 100+)",
        },
        'LFP_BANNED': "Banned from LFP",
        'LFP': {
            'VANILLA': "Vanilla",
            'BI': "Bi/Pansexual",
            'GAY': "Gay",
            'LESBIAN': "Lesbian",
            'FUTA': "Futa",
            'RPFUTA': "RP with Futas",
            'FURRY': "Furry",
            'RPFURRY': "RP with Furries",
            'BEAST': "Beast",
            'HYBRID': "Hybrid",
            'RPBEAST': "RP with Beasts",
            'EXTREME': "Extreme",
        }
    },

    'reportToAsheN': function (errMsg: string) {
        try {
            AsheN.send(errMsg);
        } catch (e) {
            if (!_.isUndefined(localConfig)) console.log("(" + moment().format('MMM DD YYYY - HH:mm:ss.SSS') + ") Failed to start up.");
        }
    },

    'log': function (message: string, moduleName: string, level: string) {
        if (_.isUndefined(channels.logs)) return;
        level = ((_.isUndefined(level)) ? this.logLevel.INFO : level);
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

        if (_.isEqual(level, this.logLevel.FATAL)) this.reportToAsheN(message);
        // channels.logs.send(logMessage);
        let logEmbed = new DiscordJS.MessageEmbed()
        .setAuthor(level)
        .setColor(embedColor)
        .setDescription(message)
        .setFooter(moduleName)
        .setTimestamp(new Date());
        if (typeof channels.logs === "string") return;
        channels.logs.send(logEmbed);

        if (_.isUndefined(localConfig)) return;
        console.log(logMessage);
    },

    'logLevel': {
        'INFO':  "INFO",
        'WARN':  "WARN",
        'ERROR': "**ERROR**",
        'FATAL': "__**FATAL**__",
    },

    'image_link_count': function (message_string: string) {
        return (message_string.toUpperCase().match(/\.PNG|\.JPG|\.JPEG|\.TIFF|\.BMP|\.PPM|\.PGM|\.PBM|\.PNM|\.WEBP|\.SVG|\.GIF/g) || []).length;
    },

    'level_to_role': function (level: number) {
        let result: DiscordJS.Role | string;
        if (level < 5) {
            result = util.roles.LVL.LVL_0;
        } else if (level < 10) {
            result = util.roles.LVL.LVL_5;
        } else if (level < 20) {
            result = util.roles.LVL.LVL_10;
        } else if (level < 30) {
            result = util.roles.LVL.LVL_20;
        } else if (level < 40) {
            result = util.roles.LVL.LVL_30;
        } else if (level < 50) {
            result = util.roles.LVL.LVL_40;
        } else if (level < 60) {
            result = util.roles.LVL.LVL_50;
        } else if (level < 70) {
            result = util.roles.LVL.LVL_60;
        } else if (level < 80) {
            result = util.roles.LVL.LVL_70;
        } else if (level < 90) {
            result = util.roles.LVL.LVL_80;
        } else if (level < 100) {
            result = util.roles.LVL.LVL_90;
        } else {
            result = util.roles.LVL.LVL_100;
        }
        return <DiscordJS.Role>result;
    },

    'handle_level_up': async function(message: DiscordJS.Message) {
        const member = await message.mentions.members?.first()?.fetch();
        if (!member) return;
        const user = member.user;
        const level_string = message.content.match(/level \d+/g)?.[0];
        if (!level_string) return;
        const level = parseInt(level_string.match(/\d+/g)?.[0] || "");

        const new_role = util.level_to_role(level);
        const updated_roles = member.roles.cache.filter(role => !_.contains(util.roles.LVL, role)).set(new_role.id, new_role);
        const added_roles = updated_roles.filter(role => !member.roles.cache.has(role.id));
        const removed_roles = member.roles.cache.filter(role => !updated_roles.has(role.id));
        if (added_roles.size === 0 && removed_roles.size === 0) return;
        const role_gain_string = added_roles.reduce((curr, role) => curr + `${role}`, "");
        const role_lose_string = removed_roles.reduce((curr, role) => curr + `${role}`, "");

        util.log(`${(added_roles.size !== 1 || removed_roles.size !== 1) ? "⚠ Incorrect role change: " : ""}${user} gained level ${level}, so added [${role_gain_string}] and removed [${role_lose_string}]`, level_up_module, util.logLevel.INFO);

        await member.roles.set(updated_roles);

        if (level === 5) {
            await user.send("__**Congratulations!**__ :tada:\n\nYou have reached `Level 5` in the Breeding Den Server! You're now able to submit characters and join Voice Channels if you want to!" +
                "\n\n(_P.S. I'm a bot, so please don't reply!_)");
        } else if (level === 20) {
            await user.send("__**Congratulations!**__ :tada:\n\nYou have reached `Level 20` in the Breeding Den Server! You've unlocked the <#560869811157073920> " +
                "and you're able to create your own cult, as long as certain criterias are met too!" +
                "For more detailed information, please check out the very top message in <#538901164897337347>" +
                "\nIf you're interested, simply ask a Staff member and they will guide you through the process!\n\n(_P.S. I'm a bot, so please don't reply!_)");
        } else if (level === 30) {
            await user.send("__**Congratulations!**__ :tada:\n\nYou have reached `Level 30` in the Breeding Den Server! You're now able to get yourself a __Custom Role__ if you want to!" +
                "\nSimply ask a Staff member and tell them the __Name__ and __Color__ (ideally in Hexcode) of the Custom role!\n\n(_P.S. I'm a bot, so please don't reply!_)");
        }

        await message.react('✅').catch(console.error);
    },

    'time': function(time_ms: number) {
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
};

client.login(_.isUndefined(localConfig) ? process.env.BOT_TOKEN : localConfig.TOKEN);
