let localConfig: any;
try { localConfig = require("./localConfig"); } catch (e) { }

import * as DiscordJS from "discord.js";
const client = new DiscordJS.Client();
import _ = require("underscore");
import moment = require("moment");
import assert = require('assert');
import schedule = require('node-schedule');

const debug = true;

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
};
type Str_to_Role = {
    [key: string]: string | DiscordJS.Role
}
type Str_to_Emoji = {
    [key: string]: string | DiscordJS.GuildEmoji
}

let channels = <Str_to_Channel>{
    'main': "accalia-main",
    'level': "📈level-up-log",
    'logs': "accalia-logs",
    'warnings': "🚨warnings",
    'charSub': "📃character-submission",
    'charArchive': "📚character-archive",
    'charIndex': "📕character-index",
    'reports': "📮reports-and-issues",
    'lfp-info': "📌lfp-info",
    'lfp-contact': "💬lfp-contact",
    'lfp-male': "🍆lfp-male",
    'lfp-female': "🍑lfp-female",
    'lfp-vanilla': "🍦lfp-vanilla",
    'lfp-gay': "👬lfp-gay",
    'lfp-lesbian': "👭lfp-lesbian",
    'lfp-trans': "🌽lfp-trans",
    'lfp-futa': "🥕lfp-futa-herm",
    'lfp-furry': "😺lfp-furry",
    'lfp-bestiality': "🦄lfp-bestiality",
    'lfp-extreme': "✨lfp-extreme",
    'lfp-long': "📰lfp-long-term-plot",
    'lfp-vc': "🎤lfp-vc",
    'lfp-sfw': "🌺lfp-sfw",
    'nsfw-general': "🔞nsfw-general",
    'nsfw-media': "👅nsfw-media",
    'tinkering': "tinkering",
    'authentication-logs': "🎫authentication-logs",
    'paranoia-plaza': "🙈ashs-paranoia-plaza",
};

let roles = <Str_to_Role>{
    "No_Ping": "DONT PING⛔",
    "Newcomer": "Newcomer",
    "CustomRoles": "--Custom Roles--"
};
let emojis = <Str_to_Emoji>{
    "bancat": "bancat",
    "pingmad": "pingmad",
    "pingangry": "pingangry",
};
type LFP_Timer = {
    [key: string]: NodeJS.Timeout
}
let lfpTimer: LFP_Timer;
let lfpChannels: DiscordJS.TextChannel[] = [];
let AsheN: DiscordJS.User;
let lockdown = false;
let disableMentions = true;
let ping_violation_reaction_emoji = emojis.pingangry;
const level_up_module = "Level roles";
const link_regex = /((https?|ftp):\/\/|www\.)(\w.+\w\W?)/g; //source: https://support.discordapp.com/hc/en-us/community/posts/360036244152-Change-in-text-link-detection-RegEx
let invites: DiscordJS.Collection<string, DiscordJS.Invite>;

type MongoClient = any;

const dbMod = {
    'warnUser': function (member: DiscordJS.User, level: number, warner: DiscordJS.GuildMember, reason?: string) {
        util.log(`Calling DB Module`, 'DB/warnUser', util.logLevel.INFO);
        try {
            util.log(`Attempting to connect to DB`, 'DB/warnUser', util.logLevel.INFO);
            this.connect( function(db: MongoClient) { //TODO: Change any to MongoDB.Client or something using mongodb-typescript
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
        } catch (e) {
            util.log('Failed to do "warnUser".', 'DB/warnUser', util.logLevel.FATAL);
        }
    },
    'connect': function (callback: (db: MongoClient) => any) {
        MongoClient.connect(url, { useNewUrlParser: true }, (err: any, client: MongoClient) => {
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
        //try {
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

            lfpChannels.push(<DiscordJS.TextChannel>channels["lfp-bestiality"]);
            lfpChannels.push(<DiscordJS.TextChannel>channels["lfp-extreme"]);
            lfpChannels.push(<DiscordJS.TextChannel>channels["lfp-female"]);
            lfpChannels.push(<DiscordJS.TextChannel>channels["lfp-furry"]);
            lfpChannels.push(<DiscordJS.TextChannel>channels["lfp-futa"]);
            lfpChannels.push(<DiscordJS.TextChannel>channels["lfp-gay"]);
            lfpChannels.push(<DiscordJS.TextChannel>channels["lfp-lesbian"]);
            lfpChannels.push(<DiscordJS.TextChannel>channels["lfp-long"]);
            lfpChannels.push(<DiscordJS.TextChannel>channels["lfp-male"]);
            lfpChannels.push(<DiscordJS.TextChannel>channels["lfp-sfw"]);
            lfpChannels.push(<DiscordJS.TextChannel>channels["lfp-vc"]);
            lfpChannels.push(<DiscordJS.TextChannel>channels["lfp-trans"]);
            lfpChannels.push(<DiscordJS.TextChannel>channels["lfp-vanilla"]);

            server.fetchInvites()
                .then(invs => invites = invs);

            cmd.cn();
            this.testschedule();

        //} catch (e) {
        //    if (!_.isUndefined(localConfig)) console.log(`(${moment().format('MMM DD YYYY - HH:mm:ss.SSS')}) Failed to start up.`);
        //}
    },
    'testschedule': function () {
        // Cron-format: second 0-59 optional; minute 0-59; hour 0-23; day of month 1-31; month 1-12; day of week 0-7
        let j = schedule.scheduleJob('*/60 * * * *', function(fireDate){
            cmd.cn();
        });
    }
};

client.on("ready", () => {
    startUpMod.initialize(`Looking cursed. Also I'M AWAKE! AWOOO~`);

    //Catch up on missed level-ups
    if (!(channels.level instanceof DiscordJS.TextChannel)) {
        return;
    }
    channels.level.messages.fetch({ "limit": 100 })
        .then(messages => {
            //Remove duplicates so that when someone levels from lvl 3 to 4 and lvl 4 to 5 it doesn't trigger 2 level-up handles
            let seen_users = new DiscordJS.Collection<string, DiscordJS.Message>();
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

client.on("guildMemberAdd", (member) => {
    const invite_channel = <DiscordJS.TextChannel>channels.tinkering;
    const invitee_is_new = new Date().getTime() - (client.users.cache.get(member.id)?.createdTimestamp || 0) < 1000 * 60 * 60 * 24;
    const invitee_str = `${member}${invitee_is_new ? `(:warning: new account from ${util.time(new Date().getTime() - (member.joinedTimestamp || 0))} ago)` : ""}` +
    `(${member.user?.username}#${member.user?.discriminator})`;
    server.fetchInvites()
    .then(invs => {
        let inv_string = invites.reduce((curr, old_invite) => {
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
                curr += `${invitee_str} **joined**; Invited by\n${inviter_is_recent ? ":warning: recent member " : ""}${old_invite.inviter}(${old_invite.inviter?.username}#${old_invite.inviter?.discriminator}) ` +
                    `${inviter_has_left ? "who already left " : ""}(**${new_uses}** invite(s) on ${expired ? "expired " : ""}code **${old_invite.code}**)\n`;
            }
            if (new_uses > old_uses + 1) {
                curr += `Sorry, I missed ${new_uses - old_uses - 1} join(s) invited by ${old_invite.inviter}, should be people below this message.\n`;
            }
            return curr;
        }, "");
        if (inv_string === "") {
            inv_string = `I can't figure out how ${invitee_str} joined the server.`;
        }
        invite_channel.send(new DiscordJS.MessageEmbed().setDescription(inv_string));
        invites = invs;
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

client.on('messageReactionAdd', (messagereaction, user) => {
    if (user instanceof DiscordJS.User && messagereaction) {
        fnct.approveChar(messagereaction.message, messagereaction.emoji, user);
    }
});

client.on('raw', packet => {
    // We don't want this to run on unrelated packets
    if (!['MESSAGE_REACTION_ADD', 'MESSAGE_REACTION_REMOVE'].includes(packet.t)) return;
    // Grab the channel to check the message from
    const c = client.channels.cache.get(packet.d.channel_id);
    if (c?.type !== "text") {
        return;
    }
    const channel = c as DiscordJS.TextChannel;
    // There's no need to emit if the message is cached, because the event will fire anyway for that
    if (channel.messages.cache.has(packet.d.message_id)) return;
    // Since we have confirmed the message is not cached, let's fetch it
    channel.messages.fetch(packet.d.message_id).then(message => {
        // Emojis can have identifiers of name:id format, so we have to account for that case as well
        const emoji = packet.d.emoji.id ? `${packet.d.emoji.name}:${packet.d.emoji.id}` : packet.d.emoji.name;
        // This gives us the reaction we need to emit the event properly, in top of the message object
        const reaction = message.reactions.cache.get(emoji);
        // Adds the currently reacting user to the reaction's users collection.
        if (reaction) {
            const user = client.users.cache.get(packet.d.user_id);
            if (user) {
                reaction.users.cache.set(packet.d.user_id, user);
            }
        }
        // Check which type of event it is before emitting
        if (packet.t === 'MESSAGE_REACTION_ADD') {
            client.emit('messageReactionAdd', reaction, client.users.cache.get(packet.d.user_id));
        }
        if (packet.t === 'MESSAGE_REACTION_REMOVE') {
            // client.emit('messageReactionRemove', reaction, client.users.get(packet.d.user_id));
        }
    });
});

client.on("message", (message: DiscordJS.Message) => {
    if (client === null || client.user === null) {
        return;
    }
    if (_.isEqual(message.author.username, client.user.username)) return;
    if (message.channel.type !== "text") return; // Ignore DMs
    if (typeof channels.tinkering === "string") {
        return;
    }
    if (message.author.bot) {
      if (!(
          (_.isEqual(message.author.id, "159985870458322944") && _.isEqual(message.channel.name, "📈level-up-log")) ||
          (_.isEqual(message.author.id, "155149108183695360") && _.isEqual(message.channel.name, "🚨reports-log")) ||
          (_.isEqual(message.author.username, "Carl-bot Logging") && _.isEqual(message.channel.name, "🎫authentication-logs"))
      )) {
          return;
      }
    }
    if (message.channel.guild.id !== server.id) return; // Ignore non-main servers
    if (lockdown) return;

    if (message.content === "_Lilli") {
        process.exit(0);
    }

    if (debug) {
        return;
    }

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
        //warn users who post too fast
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

                    if (previous_message.createdTimestamp !== 0) {
                        time_passed_s = ~~((message.createdTimestamp - previous_message.createdTimestamp) / 1000);
                        if (time_passed_s < 60 * 60 * 4) {
                            violationMode += 2;
                        }
                    }
                }
                if (violationMode === 0) {
                    return;
                }

                let warnMsg = `${message.author}, your Looking For Partner ad in ${message.channel} `;
                let reason = "";
                if (violationMode === 1) { reason = `contains more than 3 images.`; }
                if (violationMode === 2) { reason = `was sent too fast (after ${~~(time_passed_s / 3600)} hours and ${~~((time_passed_s % 3600) / 60)} minutes).`; }
                if (violationMode === 3) { reason = `contains more than 3 images AND was sent too fast (after ${~~(time_passed_s / 3600)} hours and ${~~((time_passed_s % 3600) / 60)} minutes).`; }

                message.react('❌')
                    .then() // react success
                    .catch(e => {
                        util.sendTextMessage(channels.main, `HALP, I cannot warn ${message.author} for violating the LFP rules in ${message.channel}! Their ad ${reason}\n` +
                            `Violating Message Link: ${message.url}\n` +
                            `Previous Message Link: ${previous_message.message.url}`);
                    });

                warnMsg += `${reason} \nPlease follow the guidelines as described in ${channels["lfp-info"]}. Thanks! :heart:`;
                util.sendTextMessage(channels["lfp-contact"], warnMsg);
                util.log(`${message.author}'s lfp ad in ${message.channel} ${reason}`, "lfpAdViolation", util.logLevel.INFO);
            })
            .catch(e => {
                util.log('Failed: ' + e.toString(), 'lfpAdViolation', util.logLevel.WARN);
            });
    }

    // delete links in nsfw-general
    if (_.isEqual(message.channel.id, (<DiscordJS.TextChannel>channels["nsfw-general"]).id)) {
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

    // be paranoid about newcomers who invite people
    if (_.isEqual(message.channel.id, channels.tinkering.id)) {
        const invite_regex = /<@\d+> \*\*joined\*\*; Invited by \*\*.*\*\* \(\*\*\d+\*\* invites\)/g;
        if (!message.content.match(invite_regex)) { //not an invite message
            return;
        }
        const before_name = "> **joined**; Invited by **";
        const after_name = "** (**";
        const name_start_pos = message.content.indexOf(before_name) + before_name.length;
        const name_end_pos = message.content.indexOf(after_name);
        const name = message.content.substr(name_start_pos, name_end_pos - name_start_pos);
        if (name === "DISBOARD" || name === "AsheN") { //Can't be paranoid about people joining via their invites. Or can we?
            return;
        }
        const before_invites = before_name + name + "** (**";
        const after_invites = "** invites)";
        const before_invites_pos = message.content.indexOf(before_invites) + before_invites.length;
        const after_invites_pos = message.content.indexOf(after_invites);
        const invites = parseInt(message.content.substr(before_invites_pos, after_invites_pos - before_invites_pos));
        const members = server.members.cache.filter(member => member.user.username === name);
        if (members.size === 0) {
            util.sendTextMessage(channels.tinkering, `Failed figuring out who ${name} is.`);
            return;
        }
        const inferred_members_text = members.reduce((member, result) => `${member} ${result}`, "").trim();
        const newcomer_role_id = "595288534152118273";
        const newcomer_role = server.roles.cache.get(newcomer_role_id);
        const newcomer_members = members.find(member => member.roles.cache.has(newcomer_role_id));
        if (newcomer_members) {
            util.sendTextMessage(channels["paranoia-plaza"], `:warning: Got ${newcomer_role} invite number ${invites} for ${message.mentions?.members?.first()} from ${members.size === 1 ? "" : "one of "}${inferred_members_text}.`);
        }
        return;
    }

    //copy new account joins from auth log to paranoia plaza
    if (message.channel.id === (<DiscordJS.TextChannel>channels["authentication-logs"]).id) {
        if (!message.embeds) { //Stop chatting in the auth log channel :reeeee:
            return;
        }
        message.embeds.forEach(embed => {
            const index = embed.description?.indexOf("**NEW ACCOUNT**");
            if (index && index > 0) {
                (<DiscordJS.TextChannel>channels["paranoia-plaza"]).send(new DiscordJS.MessageEmbed(embed))
                .catch(console.error);
            }
        });
        return;
    }

    // If not from Mee6 and contains mentions
    if (message.mentions?.members?.size && !_.isEqual(message.author.id, "159985870458322944") && !_.isEqual(message.channel.id, (<DiscordJS.TextChannel>channels["lfp-contact"]).id)) {
        // react with :pingangry: to users who mention someone with the Don't Ping role
        const dontPingRole = server.roles.cache.find(r => _.isEqual(r.name, util.roles.DONTPING));
        if (!dontPingRole) {
            return;
        }
        const no_ping_mentions = message.mentions.members.filter(member => (member.roles.cache.has(dontPingRole.id) && !_.isEqual(member.user, message.author)));
        if (no_ping_mentions.size !== 0) {
            const no_ping_mentions_string = no_ping_mentions.reduce((prev_member, next_member) => prev_member + `${next_member} `, "");
            const log_message = `${message.author} pinged people with <@&${dontPingRole.id}>:\n${no_ping_mentions_string}\nMessage Link: <${message.url}>`;
            if (!util.isUserStaff(message.author)) { // exclude staff
                util.log(log_message, "Ping role violation", util.logLevel.INFO);
                message.react(ping_violation_reaction_emoji)
                    .catch(error => {
                        util.log(`Failed reacting to <${message.url}>`, "Ping role violation", util.logLevel.WARN);
                        util.sendTextMessage(channels.main, `HALP, I'm blocked by ${message.author}!\n` +
                            `They pinged people with the <@&${dontPingRole.id}> role!\nMessage Link: <${message.url}>`);
                    });
            }
        }
    }

    if (_.isEqual(message.channel.name, "📈level-up-log")) {
        util.handle_level_up(message);
    }

    if (message.mentions.members && message.mentions.members.has(client.user.id)) {
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
            let color = 0;
            let target = "";

            switch (channel.name.substr(6).split(/-/g)[0]) {
                case "male":
                    title = "MALES";
                    color = server.roles.cache.find(role => _.isEqual(role.name, "Male"))?.color || 0;
                    target = "Males, Femboys, etc.";
                    break;
                case "female":
                    title = "FEMALES";
                    color = server.roles.cache.find(role => _.isEqual(role.name, "Female"))?.color || 0;
                    target = "Females, Tomboys, etc.";
                    break;
                case "vanilla":
                    title = "VANILLA RP";
                    color = server.roles.cache.find(role => _.isEqual(role.name, "Vanilla"))?.color || 0;
                    target = "People with Vanilla Kinks and the \"Vanilla\" role";
                    break;
                case "gay":
                    title = "GAY (Male x Male) RP";
                    color = server.roles.cache.find(role => _.isEqual(role.name, "Gay"))?.color || 0;
                    target = "Males with the \"Gay\" and/or \"Bi/Pansexual\" role";
                    break;
                case "lesbian":
                    title = "LESBIAN (Female x Female) RP";
                    color = server.roles.cache.find(role => _.isEqual(role.name, "Lesbian"))?.color || 0;
                    target = "Females with the \"Lesbian\" and/or \"Bi/Pansexual\" role";
                    break;
                case "trans":
                    title = "TRANS";
                    color = server.roles.cache.find(role => _.isEqual(role.name, "MtF"))?.color || 0;
                    target = "People with the MtF and FtM roles";
                    break;
                case "futa":
                    title = "FUTANARI / HERMAPHRODITE";
                    color = server.roles.cache.find(role => _.isEqual(role.name, "Futa"))?.color || 0;
                    target = "Futanari and Hermaphrodites (not trans)";
                    break;
                case "furry":
                    title = "FURRY / ANTHRO";
                    color = server.roles.cache.find(role => _.isEqual(role.name, "Furry"))?.color || 0;
                    target = "Furries and Anthromorphs (not beasts/bestiality rp)";
                    break;
                case "bestiality":
                    title = "BESTIALITY RP";
                    color = server.roles.cache.find(role => _.isEqual(role.name, "Beast"))?.color || 0;
                    target = "Beasts, people interested in Bestiality RP (not furries)";
                    break;
                case "xtreme":
                    title = "EXTREME KINKS RP";
                    color = server.roles.cache.find(role => _.isEqual(role.name, "Extreme"))?.color || 0;
                    target = "People with Extreme Kinks and the \"Extreme\" role";
                    break;
                case "long":
                    title = "LONG TERM / PLOT DRIVEN RP";
                    color = 0x00FFCA;
                    target = "People who would like a long term and/or plot driven RP";
                    break;
                case "vc":
                    title = "VOICE CHATS  / ETC.";
                    color = 0xA8A8A8;
                    target = "People wanting to find others to go in a Voice Chat session or etc. with";
                    break;
                case "sfw":
                    title = "NON-EROTIC";
                    color = 0xCA2C92;
                    target = "People who would like a non-erotic RP";
                    break;
            }

            let lfpEmbed = new DiscordJS.MessageEmbed()
                .setColor(color)
                .setTitle("Looking for " + title + " Channel Info")
                .setDescription(
                    "This channel is specifically for posts, which are **looking for " + title + "**.\n\n" +
                    "If you do see posts, which are __not clearly looking for these kinds of RP/things__ in this channel, **please** let the staff team know in " + channels.reports + "!\n\n" +
                    "If you want to **contact** someone who posted in this channel, **please check their DM Roles** first before doing so and please use " + channels["lfp-contact"] + "!\n\n" +
                    "*More info in:* " + channels["lfp-info"]
                )
                .addField(
                    "What posts are to be expected and to be posted in this channel?",
                    "LFP Ads, which explicitly state that they are __looking for " + title + "__"
                )
                .addField(
                    "Target Audience for LFP posts:",
                    target
                )
            ;

            let lfpMsg =
                `>>> __**Looking for ${title} Channel Info**__\n` +
                `This channel is specifically for posts, which are **looking for ${title}**.\n\n` +
                `🔹 __What posts are to be expected and to be posted in this channel?__\n` +
                `LFP Ads, which explicitly state that they are **looking for ${title}**\n\n` +
                `🔹 __Target Audience for LFP posts:__\n` +
                `${target}\n\n` +
                `If you do see posts, which are __not clearly looking for these kinds of RP/things__ in this channel, **please** let the staff team know in ${channels.reports}!\n\n` +
                `If you want to **contact** someone who posted in this channel, **please check their DM Roles** first before doing so and please use ${channels["lfp-contact"]}!\n\n` +
                `*More info in:* ${channels["lfp-info"]}\n\n`
            ;

            channel.send(lfpMsg)
            .then(() => util.log('Updated lfp info in ' + channel, "lfpInfo", util.logLevel.INFO))
            .catch(error => util.log(`Failed updating lfp info in ${channel} because ${error}`, "lfpInfo", util.logLevel.ERROR));
        }, 2000);
    }
});

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
            let member = message.mentions.members?.first() || message.guild?.members.cache.get(args[0] || "");
            //TODO: Change member type from DiscordJS.GuildMember to DiscordJS.User so we can warn people who left
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
        if (debug) {
            return;
        }
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
        let newcomerMembers = newcomerRole.members.map(m => m.user);
        const channel = message ? message.channel : channels.main;
        if (typeof channel === "string") {
            console.log("Fucking channels are strings and not channels :reeee:");
            return;
        }
        _.each(newcomerMembers, (member, index) => {
            util.log(" Clearing newcomer role from: " + member + " (" + (index+1) + "/" + newcomerMembers.length + ")", "clearNewcomer", util.logLevel.INFO);
            try {
                if ((new Date().getTime() - (server.member(member)?.joinedAt?.getTime() || 0))/1000/60 <= 10) { // joined less than 10 minutes ago
                    return;
                }
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
        /*
        if (!message) {
            return;
        }
        if (util.isStaff(message)) {
            const ancientrole = server.roles.cache.find(role => _.isEqual(role.name, util.roles.ANCIENT));
            if (!ancientrole) {
                console.error(`Ancient role not found!`);
                return;
            }
            let ancientTimeThreshold = new Date(server.createdTimestamp + (new Date().getTime() - server.createdTimestamp) / 5);
            util.sendTextMessage(message.channel, `Threshold for "Ancient Member" is at: ${ancientTimeThreshold.toString()}`);

            let ancientMembers = server.members.cache.filter(m => {
                return ((m.joinedTimestamp || 0) <= ancientTimeThreshold.getTime()) && (!m.user.bot) && _.isNull(m.roles.cache.find(r => _.isEqual(r.name, util.roles.ANCIENT)));
            });

            ancientMembers.forEach(member => {
                member.roles.add(ancientrole).then();
                console.log(member.user.username + ", last message: " + (member.lastMessage?.createdAt || " too old"));
            });
        } else {
            util.sendTextMessage(message.channel, "Shoo! You don't have permissions for that!");
        }
        */
    },
    'call': async function (message) {
        const args = message?.content.slice(prefix.length).trim().split(/ +/g);
        const command = args?.shift()?.toLowerCase();
        try {
            if (_.isEqual(command, "call")) return;
            if (!command) return;
            if (_.isUndefined(this[command])) return;
            await this[command](message, args || (<string[]>[]));
            util.log(message?.author.username + ' is calling command: ' + command, command, util.logLevel.INFO);
        } catch (e) {
            util.log(`Failed to process (${command})`, command || "undefined", util.logLevel.ERROR);
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
            let target_string = "";
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
                    util.sendTextMessage(message.channel, new DiscordJS.MessageEmbed().setDescription(`${user}'s Avatar`).setImage(user.displayAvatarURL({"size": 2048, "dynamic": true})));
                }
                else {
                    util.sendTextMessage(message.channel, new DiscordJS.MessageEmbed().setDescription(`Invalid User: <@${snowflake}>`));
                }
            }).catch(error => util.sendTextMessage(message.channel, `Invalid user ID: <@${snowflake}>`));
        });
    },
};

const fnct = {
    'serverStats': function (modes: string[]) {
        if (debug) {
            return;
        }
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
                        str = "📈New users: " + server.members.cache.filter(member => !member.user.bot && ((new Date().getTime() - (member.joinedAt?.getTime() || 0)) / 1000 / 60 / 60 / 24) <= 1).size;
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
                        let age = Math.floor((new Date().getTime() - server.createdAt.getTime()) / 1000 / 60 / 60 / 24);
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
    'approveChar': function(message: DiscordJS.Message, reaction: DiscordJS.Emoji, user: DiscordJS.User) {
        if (debug) {
            return;
        }
        if (message.channel instanceof DiscordJS.DMChannel) {
            return;
        }
        if (typeof channels.charIndex === "string") {
            console.error("Can't approve character because character index channel was not resolved.");
            return;
        }
        if (typeof channels.charSub === "string") {
            console.error("Can't approve character because character submissions channel was not resolved.");
            return;
        }
        if (typeof channels.charArchive === "string") {
            console.error("Can't approve character because character archive channel was not resolved.");
            return;
        }
        try {
            if (_.isEqual(message.channel.name, channels.charSub.name) && util.isUserStaff(user)) {
                let msgType = _.isEqual(reaction.name, "⭐") ? 1 : _.isEqual(reaction.name, "✅") ? 2 : 0;
                if (msgType === 0) {
                    return;
                }
                let msgAttachments = message.attachments.map(a => a.url);
                let msgImagesString = "";
                _.each(msgAttachments, imgUrl => msgImagesString += imgUrl + "\n");
                util.log(`${user} approved character message:\n ${message.content}\n ${msgImagesString}`, "approveCharacter", util.logLevel.INFO);
                let msgContent = `User: ${message.author}\n${message.content}`;
                channels.charArchive.send(msgType === 1 ? msgContent : message.content, { files: msgAttachments })
                    .then(() => {
                        if (typeof channels.charIndex === "string") {
                            console.error("Can't approve character because character index channel was not resolved.");
                            return;
                        }
                        if (msgType === 1) {
                            channels.charIndex.send(`\`${message.author} Your character has been approved/updated and can be found in the index under \"\"\``);
                        }
                        channels.charIndex.send(`\`r!addchar \"charName\"\n${message.content}\n${msgImagesString}\``);
                    });
            }
        } catch (e) {
            util.log(e, 'approveCharacter', util.logLevel.ERROR);
        }
    }
};

process.on("unhandledRejection", (error) => {
    console.error(error); // This prints error with stack included (as for normal errors)
    throw error; // Following best practices re-throw error and let the process exit with error code
});


const util = {
    'sendTextMessage': function (channel: DiscordJS.TextChannel | DiscordJS.DMChannel | string, message: DiscordJS.MessageEmbed | string) {
        if (typeof channel === "string") {
            util.log(`Failed sending message to channel ${channel} because it wasn't resolved.`, "generic", util.logLevel.ERROR);
            return;
        }
        try {
            if (channel) {
                channel.startTyping();
                setTimeout(function(){
                    channel.send(message);
                    channel.stopTyping(true);
                }, 1500);
            }
        } catch (e) {
            this.log('Failed to send message: ' + message, this.logLevel.ERROR);
        }
    },

    'isStaff': function (message: DiscordJS.Message): boolean {
        if (!message) {
            console.log("Didn't get a message");
        }
        return message.author.lastMessage?.member?.roles.cache.find(role => _.isEqual(role.name, this.roles.STAFF) || _.isEqual(role.name, this.roles.TRIALMOD)) !== null || message.author === AsheN;
    },

    'isUserStaff': function (user: DiscordJS.User) {
        const staffRole = server.roles.cache.find(role => role.name === util.roles.STAFF || role.name === util.roles.TRIALMOD);
        if (!staffRole) {
            console.error("Can't resolve staff role");
            return;
        }
        return (server.roles.cache.get(staffRole.id)?.members.map(m => m.user).filter(staffMember => _.isEqual(staffMember, user)).length || 0) > 0;
    },

    'roles': {
        'DONTPING': "DONT PING⛔" as string | DiscordJS.Role,
        'STAFF': "Staff" as string | DiscordJS.Role,
        'TRIALMOD': "Trial-Moderator" as string | DiscordJS.Role,
        'ANCIENT': "💠Ancient Member" as string | DiscordJS.Role,
        'NEW': "Newcomer" as string | DiscordJS.Role,
        'NSFW': "NSFW" as string | DiscordJS.Role,
        'MUTED': "Muted" as string | DiscordJS.Role,
        'INNOCENT': "Innocent" as string | DiscordJS.Role,
        'WARN_1': "Warned 1x" as string | DiscordJS.Role,
        'WARN_2': "Warned 2x" as string | DiscordJS.Role,
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
        'LFP_BANNED': "Banned from LFP" as string | DiscordJS.Role,
        'LFP': <Str_to_Role>{
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

    'log': function (message: string, moduleName: string, level?: string) {
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
        if (typeof channels.logs === "string") {
            console.error("Failed resolving logs channel");
            return;
        }
        channels.logs.send(logEmbed)
        .catch(console.error);

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

    'level_to_role': function (level: number): DiscordJS.Role {
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

    'handle_level_up': function(message: DiscordJS.Message) {
        if (!message.mentions.members || message.mentions.members.size !== 1) {
            return;
        }
        const member = message.mentions.members.first();
        if (!member) {
            return;
        }
        const user = member.user;
        const level_string = message.content.match(/level \d+/g)?.[0];
        if (!level_string) {
            return;
        }
        const level_digits = level_string.match(/\d+/g)?.toString();
        if (!level_digits) {
            return;
        }
        const level = parseInt(level_digits);
        const new_role = util.level_to_role(level);

        const old_roles = member.roles.cache.filter(role => _.contains(util.roles.LVL, role));
        let role_gain_string = "";
        if (!old_roles.find(role => role == new_role)) {
            role_gain_string = `${new_role}`;
        }
        const outdated_roles = old_roles.filter(role => role != new_role);
        let role_lose_string = "";
        if (outdated_roles.size > 0) {
            const outdated_roles_string = outdated_roles.reduce((current, next) => current + `${next}`, "");
            role_lose_string = `${outdated_roles_string}`;
        }
        const reason = `${user.username} gained level ${level}`;

        //Note: Need to be careful to add first and then remove, otherwise Yag adds the lvl0 role
        const role_remover = () => {
            if (role_lose_string) {
                member.roles.remove(old_roles, reason)
                .then(() => {
                    message.react('✅').catch(console.error);
                    util.log(`Successfully removed ${role_lose_string} from ${user}\nMessage Link: <${message.url}>.`, level_up_module, util.logLevel.INFO);
                })
                .catch(error => {
                    util.log(`Failed to remove ${role_lose_string} from ${user}\nMessage Link: <${message.url}>\nError: ${error}`, level_up_module, util.logLevel.ERROR);
                });
            }
        };
        // add role
        if (role_gain_string) {
            member.roles.add(new_role, reason)
            .then(() => {
                role_remover();
                util.log(`Successfully added ${role_gain_string} to ${user}\nMessage Link: <${message.url}>.`, level_up_module, util.logLevel.INFO);
                if (level === 5) {
                    user.send("__**Congratulations!**__ :tada:\n\nYou have reached `Level 5` in the Breeding Den Server! You're now able to submit characters and join Voice Channels if you want to!" +
                        "\n\n(_P.S. I'm a bot, so please don't reply!_)");
                } else if (level === 20) {
                    user.send("__**Congratulations!**__ :tada:\n\nYou have reached `Level 20` in the Breeding Den Server! You've unlocked the <#560869811157073920> " +
                        "and you're able to create your own cult, as long as certain criterias are met too!" +
                        "For more detailed information, please check out the very top message in <#538901164897337347>" +
                        "\nIf you're interested, simply ask a Staff member and they will guide you through the process!\n\n(_P.S. I'm a bot, so please don't reply!_)");
                } else if (level === 30) {
                    user.send("__**Congratulations!**__ :tada:\n\nYou have reached `Level 30` in the Breeding Den Server! You're now able to get yourself a __Custom Role__ if you want to!" +
                        "\nSimply ask a Staff member and tell them the __Name__ and __Color__ (ideally in Hexcode) of the Custom role!\n\n(_P.S. I'm a bot, so please don't reply!_)");
                }
            })
            .catch(error => {
                util.log(`Failed to add ${role_gain_string} to ${user}\nMessage Link: <${message.url}>\nError: ${error}`, level_up_module, util.logLevel.ERROR);
            });
        }
        else {
            // remove role
            role_remover();
        }
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
        let str = "";
        if (y) {
            str = `${y}y`;
        }
        if (d) {
            str += ` ${d}d`;
        }
        if (h) {
            str += ` ${h}h`;
        }
        if (m) {
            str += ` ${m}m`;
        }
        if (s) {
            str += ` ${s}s`;
        }
        return str.trim();
    },
};

client.login(_.isUndefined(localConfig) ? process.env.BOT_TOKEN : localConfig.TOKEN);
