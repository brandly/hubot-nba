// Description:
//   A hubot script for NBA stats

// Dependencies:

// Configuration:

// Commands:
//   hubot nba player <player name> - view individual stats
//   hubot nba team <team name> - view team stats
//   hubot nba roster <team name> - view list team's players
//   hubot nba coaches <team name> - view list team's coaches
//   hubot nba scores - view the scores and schedules of today's games
//   hubot nba standings - view Eastern and Western conference standings
//   hubot nba hustle - view hustle stat leaders

// Author:
//   brandly

const nba = require('nba')
const cheerio = require('cheerio')
const _ = require('lodash')
const Case = require('case')

module.exports = (robot) => {
  robot.Response.prototype.markdown = function (text) {
    // Check if we're using Telegram adapter
    if (robot.adapterName === 'telegram') {
      // Get the Telegram API instance from the adapter
      robot.adapter.bot.sendMessage(this.message.room, text, {
        parse_mode: 'Markdown'
      })
    } else {
      this.send(text)
    }
  }
  robot.respond(/nba player (.*)/i, (res) => {
    const name = res.match[1]
    playerIdFromName(name, (error, player) => {
      if (!player) {
        res.markdown(`Couldn't find player with name "${name}"`)
        return
      }
      getPlayerSummary(player.PERSON_ID, (error, summary) => {
        res.markdown(error || summary)
      })
    })
  })

  robot.respond(/nba team (.*)/i, (res) => {
    const name = res.match[1]
    const TeamId = nba.teamIdFromName(name)

    if (!TeamId) {
      res.markdown(`Couldn't find team with name "${name}"`)
      return
    }

    nba.stats
      .teamStats({ TeamId })
      .then((data) => {
        if (!data.length) {
          res.markdown(`Couldn't find stats for team "${TeamId}"`)
          return
        }

        const info = data[0]
        res.markdown(`
        ${info.teamName} (${info.w}-${info.l})
        ${info.pts}pts, ${info.ast}ast, ${info.reb}reb
      `)
      })
      .catch((reason) => {
        res.markdown(`Error getting team stats
      ${JSON.stringify(reason, null, 2)}`)
      })
  })

  robot.respond(/nba roster (.*)/i, function (res) {
    var TeamID, name
    name = res.match[1]
    TeamID = nba.teamIdFromName(name)
    if (TeamID == null) {
      res.markdown(`Couldn't find team with name \"${name}\"`)
      return
    }
    return playersFromTeamId(TeamID, function (error, players) {
      var listings
      if (error != null) {
        res.markdown(`Error getting team roster
${JSON.stringify(error, null, 2)}`)
        return
      }
      listings = players.map(function (player) {
        var draftDetails, pick
        if (player.DRAFT_YEAR != null) {
          pick = `Round ${player.DRAFT_ROUND}, Pick ${player.DRAFT_NUMBER}`
          draftDetails = `${pick} (${player.DRAFT_YEAR})`
        } else {
          draftDetails = 'Undrafted'
        }
        name = `${player.PLAYER_FIRST_NAME} ${player.PLAYER_LAST_NAME}`
        return `${name} #${player.JERSEY_NUMBER} (${player.POSITION})
${displayHeight(player.HEIGHT)} ${player.WEIGHT} lbs
${player.COLLEGE} | ${draftDetails}`.trim()
      })
      return res.markdown(listings.join('\n\n'))
    })
  })
  robot.respond(/nba coaches (.*)/i, function (res) {
    var TeamID, name
    name = res.match[1]
    TeamID = nba.teamIdFromName(name)
    if (TeamID == null) {
      res.markdown(`Couldn't find team with name \"${name}\"`)
      return
    }
    return nba.stats.commonTeamRoster({ TeamID }).then(
      function ({ coaches }) {
        var listings
        listings = coaches.map(function (coach) {
          return `${coach.coachName}, ${coach.coachType}
${coach.school || ''}`.trim()
        })
        return res.markdown(listings.join('\n\n'))
      },
      function (reason) {
        return res.markdown(`Error getting team coaches
${JSON.stringify(reason, null, 2)}`)
      }
    )
  })
  robot.respond(/nba scores/i, function (res) {
    var getContext, getTeamNames
    getContext = function (game) {
      if (game.hasBegun) {
        return `${game.away.score} - ${game.home.score}`
      } else if (game.series) {
        return game.series
      } else {
        return 'First matchup'
      }
    }
    getTeamNames = function (game) {
      var away, home, homeTeamWon
      ;({ away, home } = game)
      if (game.isOver) {
        homeTeamWon = home.score > away.score
        if (homeTeamWon) {
          return `${away.name} at *${home.name}*`
        } else {
          return `*${away.name}* at ${home.name}`
        }
      } else {
        return `${away.name} at ${home.name}`
      }
    }
    return getScores(function (err, scores) {
      var response
      response = scores.map(function (game) {
        return `${getTeamNames(game)}
${game.status} | ${getContext(game)}`
      })
      return res.markdown(response.join('\n\n'))
    })
  })
  robot.respond(/nba standing(s?)/i, function (res) {
    var displayTeam
    displayTeam = function (t) {
      var behind
      behind = t.gamesBehind === '-' ? '' : `(${t.gamesBehind}GB)`
      return `#${t.seed} ${t.name} ${behind}
${t.wins}W - ${t.losses}L (${t.winPercent})`
    }
    return getConferenceStandings(function (err, conferences) {
      var response
      response = conferences.map(function (conference) {
        return `${conference.name}

${conference.teams.map(displayTeam).join('\n\n')}`
      })
      return res.markdown(response.join('\n\n\n'))
    })
  })
  return robot.respond(/nba hustle/i, function (res) {
    return hustleLeaders(function (error, stats) {
      var commonKeys, statLeaderLists
      if (error != null) {
        res.markdown(`Error getting hustle leaders
${JSON.stringify(error, null, 2)}`)
        return
      }
      commonKeys = [
        'playerId',
        'playerName',
        'teamId',
        'teamAbbreviation',
        'age',
        'rank'
      ]
      statLeaderLists = stats.map(function (stat) {
        var listings
        listings = stat.leaders.map(function (leader) {
          var countKey, playerName, teamAbbreviation
          countKey = Object.keys(leader).find(function (key) {
            return !_.includes(commonKeys, key)
          })
          ;({ playerName, teamAbbreviation } = leader)
          return `${playerName} (${teamAbbreviation}) ${leader[countKey]}`
        })
        return `> ${stat.name}
${listings.join('\n')}`
      })
      return res.markdown(statLeaderLists.join('\n\n'))
    })
  })
}

function displayAverages(avg) {
  return toTable([
    `${avg.gp} GP`,
    `${avg.min} MIN`,
    `${avg.pts} PTS`,
    `${avg.fgm} FGM`,
    `${avg.fga} FGA`,
    `${displayPercentage(avg.fgPct)} FG%`,
    `${avg.fG3M} 3PM`,
    `${avg.fG3A} 3PA`,
    `${displayPercentage(avg.fg3Pct)} 3P%`,
    `${avg.ftm} FTM`,
    `${avg.fta} FTA`,
    `${displayPercentage(avg.ftPct)} FT%`,
    `${avg.oreb} OREB`,
    `${avg.dreb} DREB`,
    `${avg.reb} REB`,
    `${avg.ast} AST`,
    `${avg.stl} STL`,
    `${avg.blk} BLK`
  ])
}

function displayPercentage(num) {
  return (num * 100).toFixed(1)
}

function toTable(stats) {
  var columnCount, joinedRows, listOfColumns, paddedColumns, rowsPerColumn
  columnCount = 2
  rowsPerColumn = stats.length / columnCount
  listOfColumns = _.range(columnCount).map(function (index) {
    return stats.slice(index * rowsPerColumn, (index + 1) * rowsPerColumn)
  })
  paddedColumns = listOfColumns.map(padColumn)
  joinedRows = _.range(paddedColumns[0].length).map(function (rowIndex) {
    return _.range(columnCount)
      .map(function (columnIndex) {
        return paddedColumns[columnIndex][rowIndex]
      })
      .join(' | ')
  })
  return `\`\`\`\n${joinedRows.join('\n')}\n\`\`\``
}

function padColumn(column) {
  var widestColumn
  widestColumn = Math.max.apply(
    Math,
    column.map(function (item) {
      return item.length
    })
  )
  return column.map(function (item) {
    var index
    while (item.length < widestColumn) {
      index = item.indexOf(' ')
      item = item.slice(0, index) + ' ' + item.slice(index, item.length)
    }
    return item
  })
}

const currentScoresUrl = [
  'http://data.nba.com',
  '/data/5s/v2015/json/mobile_teams/nba',
  '/2024/scores/00_todays_scores.json'
].join('')

function requestCurrentScores(cb) {
  return fetchJson(currentScoresUrl, cb)
}

function fetchJson(url, callback) {
  fetch(url)
    .then((res) => res.json())
    .then((json) => callback(null, json))
    .catch((error) => callback(error))
}

function getScores(cb) {
  return requestCurrentScores(function (err, data) {
    var formattedScores
    if (err != null) {
      return cb(err, null)
    }
    formattedScores = data.gs.g.map(function (game) {
      return {
        hasBegun: !!game.cl,
        isOver: game.stt === 'Final',
        status: buildStatus(game),
        away: buildTeam(game.v),
        home: buildTeam(game.h),
        series: game.lm.seri
      }
    })
    return cb(null, formattedScores)
  })
}

function buildTeam(team) {
  return {
    id: team.tid,
    city: team.tc,
    name: team.tn,
    abbrev: team.ta,
    score: team.s
  }
}

function buildStatus(game) {
  if (game.stt === 'Final') {
    return 'Final'
  } else if (game.cl == null || game.cl === '00:00.0') {
    return game.stt
  } else {
    return `${game.cl} - ${game.stt}`
  }
}

const conferenceStandingsUrl = [
  'http://cdn.espn.go.com',
  '/core/nba/standings?xhr=1&device=desktop'
].join('')

function requestConferenceStandings(cb) {
  return fetchJson(conferenceStandingsUrl, cb)
}

function getConferenceStandings(cb) {
  return requestConferenceStandings(function (err, data) {
    var conferences
    if (err != null) {
      return cb(err, null)
    }
    conferences = data.content.standings.groups.map(buildConference)
    return cb(null, conferences)
  })
}

function buildConference(data) {
  return {
    name: data.name,
    teams: data.standings.entries.map(buildTeamStanding)
  }
}

function buildTeamStanding(data) {
  var getStat, stats, team
  getStat = function (stats, name) {
    var matches
    matches = stats.filter(function (stat) {
      return stat.name === name
    })
    return matches[0].displayValue
  }
  ;({ team, stats } = data)
  return {
    name: team.name,
    city: team.location,
    seed: team.seed,
    abbrev: team.abbreviation,
    wins: getStat(stats, 'wins'),
    losses: getStat(stats, 'losses'),
    winPercent: getStat(stats, 'winPercent'),
    gamesBehind: getStat(stats, 'gamesBehind')
  }
}

function getPlayerProfile(opts) {
  return nba.stats.playerProfile(opts).then(function (profile) {
    var averages, regularSeason
    regularSeason = profile.seasonTotalsRegularSeason
    averages = regularSeason[regularSeason.length - 1]
    return { averages }
  })
}

function getPlayerSummary(PlayerID, callback) {
  return Promise.all([
    nba.stats.playerInfo({ PlayerID }),
    getPlayerProfile({ PlayerID })
  ]).then(
    function ([playerInfo, playerProfile]) {
      var averages, info
      info = playerInfo.commonPlayerInfo[0]
      ;({ averages } = playerProfile)
      return callback(
        null,
        `${info.displayFirstLast} #${info.jersey}
${info.teamCity} ${info.teamName} | ${info.position}
${displayHeight(info.height)} ${info.weight} lbs

Season averages
${displayAverages(averages)}

http://nba.com/stats/player/${PlayerID}/career`
      )
    },
    function (reason) {
      return callback(`Error getting player stats
${JSON.stringify(reason, null, 2)}`)
    }
  )
}

function displayHeight(str) {
  const [feet, inches] = str.split('-')
  return `${feet}'${inches}\"`
}

function hustleLeaders(callback) {
  return nba.stats.playerHustleLeaders().then(
    function (val) {
      var stats
      stats = val.resultSets.map(function (set) {
        return {
          name: Case.title(set.name).replace('Player ', ''),
          leaders: set.rowSet.map(function (row) {
            return _.zip(set.headers, row).reduce(function (store, val) {
              store[Case.camel(val[0])] = val[1]
              return store
            }, {})
          })
        }
      })
      return callback(null, stats)
    },
    function (error) {
      return callback(error)
    }
  )
}

let cachedPlayers = null
function fetchPlayers(cb) {
  if (cachedPlayers != null) {
    cb(null, cachedPlayers)
    return
  }
  return fetch('https://www.nba.com/players')
    .then(function (res) {
      return res.text()
    })
    .then(function (text) {
      var $, data, players
      $ = cheerio.load(text)
      data = JSON.parse($('#__NEXT_DATA__').text())
      players = data.props.pageProps.players.map(function (player) {
        return Object.assign({}, player, {
          FULL_NAME: `${player.PLAYER_FIRST_NAME} ${player.PLAYER_LAST_NAME}`
        })
      })
      cachedPlayers = players
      return cb(null, players)
    })
    .catch(function (error) {
      return cb(error)
    })
}

function playerIdFromName(name, cb) {
  return fetchPlayers(function (err, players) {
    if (err != null) {
      cb(err)
      return
    }
    return cb(
      null,
      players.find(function (p) {
        return p.FULL_NAME.toLowerCase().includes(name.toLowerCase())
      })
    )
  })
}

function playersFromTeamId(teamId, cb) {
  return fetchPlayers(function (err, players) {
    if (err != null) {
      cb(err)
      return
    }
    return cb(
      null,
      players.filter(function (p) {
        return p.TEAM_ID === teamId
      })
    )
  })
}
