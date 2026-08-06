/** Permet de calculer le niveau et les PVs à retirer au boss de guilde en fonction d'un score. */
var originGuildBossCalculator = (function() {
    "use strict";

    let _module = {};

    let _guildBossLevels = [
        { level: 1, health: 2090121, totalHealth: 2090121 },
        { level: 2, health: 2923402, totalHealth: 5013523 },
        { level: 3, health: 3974208, totalHealth: 8987731 },
        { level: 4, health: 5180389, totalHealth: 14168120 },
        { level: 5, health: 6541945, totalHealth: 20710065 },
        { level: 6, health: 8198714, totalHealth: 28908779 },
        { level: 7, health: 10197308, totalHealth: 39106087 },
        { level: 8, health: 12413428, totalHealth: 51519515 },
        { level: 9, health: 14847073, totalHealth: 66366588 },
        { level: 10, health: 17700232, totalHealth: 84066820 },
        { level: 11, health: 24022303, totalHealth: 108089123 },
        { level: 12, health: 28721553, totalHealth: 136810676 },
        { level: 13, health: 34135530, totalHealth: 170946206 },
        { level: 14, health: 40334151, totalHealth: 211280357 },
        { level: 15, health: 47387335, totalHealth: 258667692 },
        { level: 16, health: 54999870, totalHealth: 313667562 },
        { level: 17, health: 63560194, totalHealth: 377227756 },
        { level: 18, health: 73549970, totalHealth: 450777726 },
        { level: 19, health: 84238935, totalHealth: 535016661 },
        { level: 20, health: 96543801, totalHealth: 631560462 }
    ];

    let _scoreFactor = 10000, // (: ils se sont pas trop cassés la tête, et ça fait plaisir)
        _minScore = 0,
        _maxScore = Math.trunc(Math.max.apply(Math, _guildBossLevels.map(l => l.totalHealth)) / _scoreFactor);

    let _$scoreInput = null,
        _$levelSpan = null,
        _$currentHealthBlock = null,
        _$currentHealthSpan = null,
        _$targetScoreButtons = null;

    /** Initialise les membres internes. */
    function initMembers() {
        _$scoreInput = $("#scoreInput");
        _$levelSpan = $(".bdg-level");
        _$currentHealthBlock = $(".bdg-health-current-level");
        _$currentHealthSpan = $(".bdg-health-current-percentage");
        _$targetScoreButtons = $(".btn-target-score");
    }

    /** Associe les handlers aux événements des membres du module. */
    function bindEvents() {
        _$scoreInput.off("change input").on("change input", function () {
            // On récupère la valeur saisie, et on s'assure d'avoir un score compris dans la plage théorique de points du boss.
            let score = parseInt(_$scoreInput.val());
            score = isNaN(score)
                ? 0
                : score < _minScore 
                    ? _minScore 
                    : score > _maxScore 
                        ? _maxScore 
                        : score;

            // On met à jour le champ avec la valeur corrigée.
            _$scoreInput.val(score);

            // On applique le calcul de con.
            let targetDamage = score * _scoreFactor,
                targetLevel = _guildBossLevels.filter(l => l.totalHealth > targetDamage)[0],
                targetRemainingHealth = targetLevel.totalHealth - targetDamage,
                targetRemainingHealthPercentage = targetRemainingHealth * 100 / targetLevel.health;

            // On met à jour les éléments visuels de l'écran.
            _$levelSpan.text(targetLevel.level);
            _$currentHealthBlock.css("width", `${targetRemainingHealthPercentage}%`);
            _$currentHealthSpan.text(`${targetRemainingHealthPercentage.toFixed(2)}`);
        });

        _$targetScoreButtons.off("click").on("click", function () {
            // Ici, on récupère le score à appliquer et on déclenche l'événement "change" de l'input.
            _$scoreInput.val($(this).attr("data-target-score"));
            _$scoreInput.trigger("change");
        });
    }

    /** Initialise le module JS. */
    _module.init = function() {
        initMembers();
        bindEvents();

        // On initialise le composant.
        _$scoreInput.trigger("change");
    };

    return _module;
})();

$(function() {
    originGuildBossCalculator.init();
})