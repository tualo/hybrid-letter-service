
module.exports =
class Command
  @commandArgs: []
  @options: []
  @help: () ->
    """
    """
  action: (program,options) ->
    console.log options
