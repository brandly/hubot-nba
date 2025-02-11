# Description:
#   A hubot script for NBA stats
#
# Dependencies:
#
# Configuration:
#
# Commands:
#   hubot nba player <player name> - view individual stats
#   hubot nba team <team name> - view team stats
#   hubot nba roster <team name> - view list team's players
#   hubot nba coaches <team name> - view list team's coaches
#   hubot nba scores - view the scores and schedules of today's games
#   hubot nba standings - view Eastern and Western conference standings
#   hubot nba hustle - view hustle stat leaders
#
# Author:
#   brandly
#

nba = require 'nba'
request = require 'superagent'
_ = require 'lodash'
Case = require 'case'

module.exports = (robot) ->

  robot.respond /nba player (.*)/, (res) ->
    name = res.match[1]
    PlayerID = nba.playerIdFromName name

    if not PlayerID?
      res.reply "Couldn't find player with name \"#{name}\""
      return

    getPlayerSummary PlayerID, (error, summary) ->
      res.reply error or summary

  robot.respond /nba team (.*)/, (res) ->
    name = res.match[1]
    TeamId = nba.teamIdFromName name

    if not TeamId?
      res.reply "Couldn't find team with name \"#{name}\""
      return

    nba.stats.teamStats({ TeamId }).then (data) ->
      if not data.length
        res.reply "Couldn't find stats for team \"#{TeamId}\""
        return

      info = data[0]

      res.reply """
        #{info.teamName} (#{info.w}-#{info.l})
        #{info.pts}pts, #{info.ast}ast, #{info.reb}reb
      """
    , (reason) ->
      res.reply """
        Error getting team stats
        #{JSON.stringify reason, null, 2}
      """

  robot.respond /nba roster (.*)/, (res) ->
    name = res.match[1]
    TeamID = nba.teamIdFromName name

    if not TeamID?
      res.reply "Couldn't find team with name \"#{name}\""
      return

    nba.stats.commonTeamRoster({ TeamID }).then ({ commonTeamRoster }) ->
      listings = commonTeamRoster.map (player) ->
        heightSplits = player.height.split '-'
        height = "#{heightSplits[0]}'#{heightSplits[1]}\""

        """
          ##{player.num} #{player.player} (#{player.position})
          #{height} #{player.weight}lbs
          #{player.age} years old (#{player.birthDate})
          #{player.school or ''}
        """.trim()
      res.reply listings.join('\n\n')
    , (reason) ->
      res.reply """
        Error getting team roster
        #{JSON.stringify reason, null, 2}
      """

  robot.respond /nba coaches (.*)/, (res) ->
    name = res.match[1]
    TeamID = nba.teamIdFromName name

    if not TeamID?
      res.reply "Couldn't find team with name \"#{name}\""
      return

    nba.stats.commonTeamRoster({ TeamID }).then ({ coaches }) ->
      listings = coaches.map (coach) ->
        """
          #{coach.coachName}, #{coach.coachType}
          #{coach.school or ''}
        """.trim()

      res.reply listings.join('\n\n')
    , (reason) ->
      res.reply """
        Error getting team coaches
        #{JSON.stringify reason, null, 2}
      """

  robot.respond /nba scores/, (res) ->

    getContext = (game) ->
      if game.hasBegun
        return "#{game.away.score} - #{game.home.score}"
      else if game.series
        return game.series
      else
        return "First matchup"

    getTeamNames = (game) ->
      { away, home } = game
      if game.isOver
        homeTeamWon = home.score > away.score
        if homeTeamWon
          "#{away.name} at *#{home.name}*"
        else
          "*#{away.name}* at #{home.name}"

      else
        "#{away.name} at #{home.name}"

    getScores (err, scores) ->
      response = scores.map (game) ->
        """
          #{getTeamNames(game)}
          #{game.status} | #{getContext(game)}
        """
      res.reply response.join('\n\n')

  robot.respond /nba standing(s?)/, (res) ->
    displayTeam = (t) ->
      behind = if t.gamesBehind is '-' then '' else "(#{t.gamesBehind}GB)"
      """
        ##{t.seed} #{t.name} #{behind}
        #{t.wins}W - #{t.losses}L (#{t.winPercent})
      """

    getConferenceStandings (err, conferences) ->
      response = conferences.map (conference) ->
        """
          #{conference.name}

          #{conference.teams.map(displayTeam).join('\n\n')}
        """
      res.reply response.join('\n\n\n')

  robot.respond /nba hustle/, (res) ->
    hustleLeaders (error, stats) ->
      if error?
        res.reply """
          Error getting hustle leaders
          #{JSON.stringify error, null, 2}
        """
        return

      commonKeys = [
        'playerId'
        'playerName'
        'teamId'
        'teamAbbreviation'
        'age'
        'rank'
      ]

      statLeaderLists = stats.map (stat) ->
        listings = stat.leaders.map (leader) ->
          countKey = Object.keys(leader).find (key) ->
            !_.includes(commonKeys, key)

          {
            playerName,
            teamAbbreviation
          } = leader

          """
            #{playerName} (#{teamAbbreviation}) #{leader[countKey]}
          """

        """
          > #{stat.name}
          #{listings.join '\n'}
        """

      res.reply(statLeaderLists.join '\n\n')

displayAverages = (avg) ->
  toTable [
    "#{avg.gp} GP"
    "#{avg.min} MIN"
    "#{avg.pts} PTS"
    "#{avg.fgm} FGM"
    "#{avg.fga} FGA"
    "#{avg.fgPct} FG%"
    "#{avg.fG3M} 3PM"
    "#{avg.fG3A} 3PA"
    "#{avg.fg3Pct} 3P%"
    "#{avg.ftm} FTM"
    "#{avg.fta} FTA"
    "#{avg.ftPct} FT%"
    "#{avg.oreb} OREB"
    "#{avg.dreb} DREB"
    "#{avg.reb} REB"
    "#{avg.ast} AST"
    "#{avg.stl} STL"
    "#{avg.blk} BLK"
  ]

toTable = (stats) ->
  columnCount = 2
  rowsPerColumn = stats.length / columnCount

  listOfColumns = _.range(columnCount).map (index) ->
    stats.slice(index * rowsPerColumn, (index + 1) * rowsPerColumn)

  paddedColumns = listOfColumns.map padColumn

  joinedRows = _.range(paddedColumns[0].length).map (rowIndex) ->
    _.range(columnCount)
      .map (columnIndex) ->
        paddedColumns[columnIndex][rowIndex]
      .join ' | '

  "```\n#{joinedRows.join '\n'}\n```"

padColumn = (column) ->
  widestColumn = Math.max.apply(Math, column.map (item) -> item.length)

  column.map (item) ->
    while item.length < widestColumn
      index = item.indexOf(' ')
      item = item.slice(0, index) + ' ' + item.slice(index, item.length)

    item

currentScoresUrl = [
  'http://data.nba.com',
  '/data/5s/v2015/json/mobile_teams/nba'
  '/2024/scores/00_todays_scores.json'
].join ''
requestCurrentScores = (cb) ->
  request
    .get(currentScoresUrl)
    .end (err, res) ->
      cb err, JSON.parse(res.text)

getScores = (cb) ->
  requestCurrentScores (err, data) ->
    return cb(err, null) if err?

    formattedScores = data.gs.g.map (game) ->
      {
        hasBegun: !!game.cl
        isOver: game.stt is 'Final'
        status: buildStatus(game)
        away: buildTeam(game.v)
        home: buildTeam(game.h)
        series: game.lm.seri
      }

    cb null, formattedScores

buildTeam = (team) ->
  {
    id: team.tid,
    city: team.tc,
    name: team.tn,
    abbrev: team.ta,
    score: team.s
  }

buildStatus = (game) ->
  if game.stt is 'Final'
    return 'Final'
  else if not game.cl? or game.cl is '00:00.0'
    return game.stt
  else
    return "#{game.cl} - #{game.stt}"

conferenceStandingsUrl = [
  'http://cdn.espn.go.com'
  '/core/nba/standings?xhr=1&device=desktop'
].join ''
requestConferenceStandings = (cb) ->
  request
    .get(conferenceStandingsUrl)
    .end (err, res) ->
      cb err, JSON.parse(res.text)

getConferenceStandings = (cb) ->
  requestConferenceStandings (err, data) ->
    return cb(err, null) if err?

    conferences = data.content.standings.groups.map buildConference
    cb null, conferences

buildConference = (data) ->
  {
    name: data.name,
    teams: data.standings.entries.map buildTeamStanding
  }

buildTeamStanding = (data) ->
  getStat = (stats, name) ->
    matches = stats.filter (stat) -> stat.name is name
    return matches[0].displayValue

  { team, stats } = data

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

getPlayerProfile = (opts) ->
  nba.stats.playerProfile(opts)
    .then (profile) ->
      regularSeason = profile.seasonTotalsRegularSeason
      averages = regularSeason[regularSeason.length - 1]

      return {
        averages
      }

getPlayerSummary = (PlayerID, callback) ->
  Promise.all([
    nba.stats.playerInfo({ PlayerID }),
    getPlayerProfile({ PlayerID })
  ]).then ([playerInfo, playerProfile]) ->
    info = playerInfo.commonPlayerInfo[0]
    { averages } = playerProfile

    callback null, """
      #{info.displayFirstLast}, #{info.teamName} #{info.position}
      #{info.height} #{info.weight}lbs

      Season averages
      #{displayAverages(averages)}

      http://stats.nba.com/player/#!/#{PlayerID}/career/
    """
  , (reason) ->
    callback """
      Error getting player stats
      #{JSON.stringify reason, null, 2}
    """

hustleLeaders = (callback) ->
  nba.stats.playerHustleLeaders().then (val) ->
    stats = val.resultSets.map (set) ->
      name: Case.title(set.name).replace 'Player ', ''
      leaders: set.rowSet.map (row) ->
        _.zip(set.headers, row)
          .reduce (store, val) ->
            store[Case.camel val[0]] = val[1]
            return store
          , {}

    callback null, stats

  , (error) -> callback(error)
